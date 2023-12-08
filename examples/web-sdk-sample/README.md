# Clickstream web SDK sample project

Creating a monorepo project with React and Express.JS using Yarn Workspaces. This is the source code of a blog post I am writing about this topic.

Read the article: [Yarn Workspaces](https://classic.yarnpkg.com/lang/en/docs/workspaces/)

## Project structure

We have 2 packages inside the project:

- **Vue2:** Vue2.x application.
- **Server:** Express.JS application.

Each of the packages have their own `package.json` file, so they define their dependencies as well as they have fully autonomy to publish a new version of the package into NPM or Yarn registry.

```
|- package.json => root workspace (private package used by yarn workspaces)
|--- packages
|------ vue2
|-------- package.json  => Vue2.x project
|------ server
|-------- package.json => Express.js project
```

## How to install and execute

> Important! The node version for the project is 16. Make sure you have that version installed in your computer. If you have NVM installed, run `nvm use 16`. If not, install it here: https://github.com/nvm-sh/nvm#install--update-script

1. Clone this repository locally `$ git clone https://github.com/awslabs/clickstream-analytics-on-aws.git`
2. Go to this example directory. `$ cd examples/web-sdk-sample/`
3. Install the dependencies. Inside the root `$ yarn install`
4. Start sample applications:

```
// Vue2 Project with server
$ yarn start-vue2
```
