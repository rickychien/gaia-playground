# Gaia playground

A simplified gaia repo to demonstrate and iterate on the new build workflow.

## Prerequisites

+ node@0.12
+ npm@2
+ ninja

## Installation

Clone gaia-playground

```bash
$ git clone git@github.com:rickychien/gaia-playground.git
```

In gaia-playground folder

```bash
$ npm install
```

Demo app will be installed in node_modules/

## Build

Building calendar app require r.js compiling which doesn't support ES6, so
please apply this quick fix:

- Make sure you have node@0.12.x
- Enable --harmony flag on top of ./node_modules/calendar/node_modules/.bin/r.js

```
#!/usr/bin/env node
```
to
```
#!/usr/bin/env node --harmony
```

Build gaia-playground

```bash
$ npm run build
```

## Clean

Clean up all generated stuffs

```bash
$ npm run clean
```
