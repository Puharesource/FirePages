const gulp = require('gulp')
const ts = require('gulp-typescript')
const sourcemaps = require('gulp-sourcemaps')
const sass = require('gulp-sass')

const del = require('del')

const paths = {
    scripts: 'src/**/*.ts',
    sass: 'src/**/*.sass',
    assets: ['src/assets/**/*']
}

gulp.task('clean', () => {
    return del(['dist'])
})

gulp.task('ts', ['clean'], () => {
    return gulp.src(paths.scripts)
        .pipe(sourcemaps.init())
        .pipe(ts({
            noImplicitAny: true,
            out: 'bundle.js',
            target: 'es5',
            rootDir: 'src',
            module: "system",
            lib: ["es2016", "dom"]
        }))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('dist'))
})

gulp.task('sass', ['clean'], () => {
    return gulp.src(paths.sass)
        .pipe(sourcemaps.init())
        .pipe(sass({ outputStyle: 'compressed' }).on('error', sass.logError))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('dist/assets/css'))
})

gulp.task('init', ['clean'], () => {
    return gulp.src('src/init.js').pipe(gulp.dest('dist'))
})

gulp.task('tinymce', ['clean'], () => {
    return gulp.src('node_modules/tinymce/**/*').pipe(gulp.dest('dist/tinymce'))
})

gulp.task('systemjs', ['clean'], () => {
    return gulp.src('node_modules/systemjs/dist/system.js').pipe(gulp.dest('dist'))
})

gulp.task('assets', ['clean'], () => {
    return gulp.src(paths.assets).pipe(gulp.dest('dist/assets'))
})

gulp.task('index', ['clean'], () => {
    return gulp.src('src/index.html').pipe(gulp.dest('dist'))
})

gulp.task('manifest', ['clean'], () => {
    return gulp.src('src/manifest/**/*').pipe(gulp.dest('dist'))
})

gulp.task('default', ['ts', 'assets', 'sass', 'manifest', 'tinymce', 'init', 'systemjs', 'index'])