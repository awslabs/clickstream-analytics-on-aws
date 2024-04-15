# Getting Started with the web console frontend of Clickstream Analytics on AWS

## Prerequisites

This project requires Node.js LTS (version 18 or later) and NPM (version 9 or later).
[Node.js](http://nodejs.org/) and [NPM](https://npmjs.org/) are really easy to install.
To make sure you have them available on your machine,
try running the following command.

```sh
$ npm -v && node -v
9.6.7
v18.17.0
```

## Available Scripts

In the root project directory, you can run:

### `pnpm install -g pnpm@8.15.3`

### `pnpm install && pnpm projen`

Install dependencies for this project.

### `pnpm nx run-many --target=build `

In the frontend directory

### `pnpm install && pnpm start`

Runs the app in the development mode.
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.
You will also see any lint errors in the console.

### `pnpm run test`

Launches the test runner in the interactive watch mode.

### `pnpm run build`

Builds the app for production to the `build` folder.

It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!
