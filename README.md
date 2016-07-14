# comma.ai Adult Coloring Book

Use it at https://commacoloring.com/

Based on https://github.com/kyamagu/js-segment-annotator
Thanks Kota Yamaguchi :)

Added a quick Heroku compatible server

## Usage

Local: "heroku local"

Upload to Heroku (free tier is fine)

To create the tables, run "heroku pg:psql" and
```sql
  CREATE TABLE data (name varchar(200), data text)
  // CREATE TABLE images (name varchar(200), data text, track text)
  CREATE TABLE images2 (name varchar(200), data text, track text, email text, gid text)
  CREATE TABLE suggestions (name varchar(200), data text)
```

Run "tools/uploader.py <paths to png files>" to upload data

## Front-end Development
Download latest (NodeJS)[https://nodejs.org/en/].
Open console and navigate to the folder where this repository's code is.
Run command.
`
npm run dev
`

This will generate javascript files, stylesheets and optimize images to `build` folder.

## Folders structure
`
- build (Generated content)
  | - assets
    | - javascripts
    | - images
    | - stylesheets

- source (Make changes here)
  | - images
  | - javascripts
  | - stylesheets

- tools

.babelrc (Used for NodeJS)
config.js (Configuration file for NodeJS)
gulpfile.babel.js (NodeJS front-end tooling)
index.html
`
