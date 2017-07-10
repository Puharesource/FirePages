const functions = require('firebase-functions')
const admin = require('firebase-admin')
const gcs = require('@google-cloud/storage')()
const webpConverter = require('webp-converter')
const path = require('path')
const fs = require('fs')
const os = require('os')

exports.convertToWebp = functions.storage.object().onChange(event => {
    const object = event.data
    const fileBucket = object.bucket
    const bucket = gcs.bucket(fileBucket)

    const resourceState = object.resourceState

    const filePath = object.name
    const fileName = filePath.split('/').pop()
    const tempFilePath = path.join(os.tmpdir(), fileName)
    const newFilePath = `${filePath}.webp`

    if (!object.contentType.startsWith('image/')) {
        console.log('Content type is not an image.')
        return
    }

    if (fileName.endsWith('.webp')) {
        console.log('Image is already webp.')
        return
    }

    if (resourceState === 'not_exists') {
        console.log('Invalid resource state')
        return
    }

    if (resourceState === 'exists' && object.metageneration > 1) {
        console.log('Invalid metageneration state')
        return
    }

    bucket.file(filePath).download({
        destination: tempFilePath
    })
    .then(() => {
        return webpConverter.cwebp(tempFilePath, tempFilePath, '-q 80', status => {
            if (status !== 100) {
                console.log('An error occured when trying to convert image to webp')
                return
            }

            console.log('Converted image to webp')
        })
    })
    .then(() => {
        console.log(`Starting upload of webp to ${newFilePath}`)

        return bucket.upload(tempFilePath, {
            destination: newFilePath
        })
    })
    .then(() => {
        console.log(`Webp image uploaded to ${newFilePath}`)
        fs.unlinkSync(tempFilePath)
    })
})