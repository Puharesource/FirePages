/// <reference types="firebase" />

import * as TinyMCE from 'tinymce'

// ===== Declarations

declare var mdc: any
declare var firebaseui: any
declare var tinymce: TinyMCE.EditorManager

// Classes
class FirePage {
    public pages = new Map<string, FirePageContent>()
    public currentPage: FirePageContent
    public loggedInUser: any

    private drawer: any
    private loginDialog: any

    private linksElement: HTMLElement

    private auth: firebase.auth.Auth
    private database: firebase.database.Database
    private storage: firebase.storage.Storage
    private firebaseUi: any

    constructor(public pagesPath: string) {
        if (!pagesPath) {
            pagesPath = ''
        }

        this.auth = firebase.auth()
        this.database = firebase.database()
        this.storage = firebase.storage()

        const MDCPersistentDrawer = mdc.drawer.MDCPersistentDrawer
        const MDCDialog = mdc.dialog.MDCDialog
        const MDCSimpleMenu = mdc.menu.MDCSimpleMenu

        const pagesRef = this.database.ref().child(pagesPath).orderByChild('order')

        const menuOnline = new MDCSimpleMenu(document.querySelector('#menu-online'))
        const menuOffline = new MDCSimpleMenu(document.querySelector('#menu-offline'))

        const dialogLogin = new MDCDialog(document.querySelector('#dialog-login'))

        const tinymceSettings = {
            selector: '[id="edit-textarea"]',
            theme: 'modern',
            plugins: [
            'advlist autolink lists link image charmap print preview hr anchor pagebreak',
            'searchreplace wordcount visualblocks visualchars code fullscreen',
            'insertdatetime media nonbreaking save table contextmenu directionality',
            'emoticons template paste textcolor colorpicker textpattern'
            ],
            toolbar1: 'insertfile undo redo | styleselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image',
            toolbar2: 'print preview media | forecolor backcolor emoticons',
            paste_data_images: true,
            image_advtab: true,
            file_browser_callback_types: 'image',
            file_picker_callback: (callback, value, meta) => {
                if (meta.filetype === 'image') {
                    const upload = document.getElementById('upload') as HTMLInputElement
                    upload.click()
                    upload.onchange = () => {
                        const file = upload.files[0]
                        const reader = new FileReader()

                        reader.onload = (event) => {
                            const result = reader.result

                            if (result.startsWith('data:image/svg')) {
                                callback(result, {
                                    alt: ''
                                })
                            } else {
                                firebase.storage().ref().child('images/' + this.generateGuid()).put(file).then(function(snapshot) {
                                    console.log('Uploaded file')

                                    callback(snapshot.downloadURL, {
                                        alt: ''
                                    })
                                })
                            }
                        }

                        reader.readAsDataURL(file)
                    }
                }
            }
        }

        tinymce.init(tinymceSettings)

        this.linksElement = document.getElementById('links')
        this.drawer = new MDCPersistentDrawer(document.querySelector('.mdc-persistent-drawer'))
        this.firebaseUi = new firebaseui.auth.AuthUI(this.auth)

        this.onClick('#button-sidebar', () => {
            this.drawer.open = !this.drawer.open
        })

        this.onClick('#button-more', () => {
            if (this.auth.currentUser) {
                menuOnline.show()
            } else {
                menuOffline.show()
            }
        })

        this.onClick('#button-login', () => {
            dialogLogin.show()
        })

        this.onClick('#button-logout', () => {
            this.auth.signOut()
            this.displayLogin()
        })

        this.onClick('#button-edit', () => {
            this.toggleEditMode()
        })

        this.onClick('#button-edit-save', () => {
            this.currentPage.title = (document.getElementById('edit-title') as HTMLInputElement).value;
            this.currentPage.order = parseInt((document.getElementById('edit-order') as HTMLInputElement).value);
            this.currentPage.content = tinymce.activeEditor.getContent()

            this.database.ref().child(pagesPath).child(this.currentPage.key).set({
                title: this.currentPage.title,
                order: this.currentPage.order,
                content: this.currentPage.content
            })

            this.toggleEditMode()
        })

        pagesRef.once('value').then(snapshot => {
            snapshot.forEach(child => {
                const key = child.key.trim()
                const value = child.val()

                value.key = key

                this.pages.set(key, value)
                this.addPageLink(key, value)
            })

            this.onPopState()
        })

        this.onViewChange()
        this.displayLogin()
    }

    private onClick(queryOrElement: string | Element, listener: EventListenerOrEventListenerObject): void {
        if (typeof queryOrElement === 'string') {
            document.querySelector(queryOrElement).addEventListener('click', listener)
            return
        }

        queryOrElement.addEventListener('click', listener)
    }

    private addPageLink(key: string, page: FirePageContent): void {
        const html = `
        <a id="nav-${key}" class="mdc-list-item" href="/${key}">
            ${page.title}
        </a>
        `

        this.linksElement.innerHTML += html

        setTimeout(() => {
            document.getElementById(`nav-${key}`).onclick = () => {
                this.navigateTo(key, true)

                return false
            }
        })
    }

    private generateGuid() {
        const s4 = () => Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1)

        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }

    onPopState(): void {
        const pathName = window.location.pathname

        if (pathName.length > 1) {
            this.navigateTo(pathName)
        } else {
            this.navigateTo('home', true)
        }
    }

    navigateTo(path: string, changePath?: boolean): void {
        if (path.startsWith('/')) {
            path = path.substring(1)
        }

        if (changePath) {
            window.history.pushState('', '', '/' + path)
        }

        let page = this.pages.get(path)

        if (!page) {
            page = this.pages.get('home')
        }

        if (this.currentPage === page) {
            return
        }

        this.currentPage = page

        for (const element of Array.from(document.querySelectorAll('[id^="nav-"]'))) {
            element.classList.remove('mdc-permanent-drawer--selected')
        }

        document.getElementById('nav-' + path).classList.add('mdc-permanent-drawer--selected')
        document.getElementById('page-content').innerHTML = this.currentPage.content;
        (document.getElementById('edit-title') as HTMLInputElement).value = this.currentPage.title;
        (document.getElementById('edit-order') as HTMLInputElement).value = `${this.currentPage.order}`
    }

    onViewChange() {
        let width: number
        let height: number

        if (window.innerWidth && window.innerHeight) {
            width = window.innerWidth
            height = window.innerHeight
        } else {
            width = document.documentElement.clientWidth
            height = document.documentElement.clientHeight
        }

        if (width >= 992) {
            this.toggleSidebar(true)
        }
    }

    toggleSidebar(toggled: boolean): void {
        this.drawer.open = toggled
    }

    displayLogin() {
        this.firebaseUi.start('#firebase-auth', {
            'signInOptions': ['password', 'google.com'],
            'callbacks': {
                'signInSuccess': (currentUser, credential, redirectUrl) => {
                    console.log('Signed in...')
                    console.log(currentUser)
                }
            }
        })
    }

    toggleEditMode() {
        const divContent = document.querySelector('#page-content')
        const divEdit = document.querySelector('#page-edit')

        tinymce.activeEditor.setContent(this.currentPage.content)

        const contentClasses = divContent.classList
        const editClasses = divEdit.classList

        if (contentClasses.contains('hidden')) {
            contentClasses.remove('hidden')
            editClasses.add('hidden')
        } else {
            contentClasses.add('hidden')
            editClasses.remove('hidden')
        }
    }
}

interface FirePageContent {
    readonly key: string,
    title: string,
    order: number,
    content: string
}

// Init

const firepages = new FirePage('pages')
