[![Build Status](https://travis-ci.com/internetarchive/iaux-lazy-loader-service.svg?branch=master)](https://travis-ci.com/internetarchive/iaux-lazy-loader-service) [![codecov](https://codecov.io/gh/internetarchive/iaux-lazy-loader-service/branch/master/graph/badge.svg)](https://codecov.io/gh/internetarchive/iaux-lazy-loader-service)

# Lazy Loader Service

An ES module to lazy load javascript. Based on the lazy loader from [Vaadin Router](https://github.com/vaadin/vaadin-router).

## Installation
```bash
npm install @internetarchive/lazy-loader-service
```

## Usage
```js
import { LazyLoaderService } from '@internetarchive/lazy-loader-service';

const lazyLoaderService = new LazyLoaderService();

await lazyLoaderService.loadScript({ src: 'https://my-server.com/some-service.js' });

// assuming `some-service.js` creates `window.someService`
const response = window.someService.getResponse('foo');

...
```

## Advanced Usage

### Use an alternate script container instead of `document.head` (the default).
```html
<div id="script-container"></div>
```

```js
import { LazyLoaderService } from '@internetarchive/lazy-loader-service';

const container = document.querySelector('#script-container');
const lazyLoaderService = new LazyLoaderService(container);
```

### Load a javascript `module` / `nomodule`
```js
import { LazyLoaderService } from '@internetarchive/lazy-loader-service';

const lazyLoaderService = new LazyLoaderService();
await lazyLoaderService.loadBundle({
  module: 'https://my-server.com/some-service-module.js',
  nomodule: 'https://my-server.com/some-service-nomodule.js'
});

const response = window.someService.getResponse('foo');
...
```

### Add additional attributes to the script tags
```js
import { LazyLoaderService } from '@internetarchive/lazy-loader-service';

const lazyLoaderService = new LazyLoaderService();
await lazyLoaderService.loadScript({
  src: 'https://my-server.com/some-service.js',
  attributes: [{ key: 'foo', value: 'bar' }]
});

=>

<script src="https://my-server.com/some-service.js" async foo="bar"></script>
```

# Development

## Prerequisite
```bash
npm install
```

## Start Development Server
```bash
npm start
```

## Testing
```bash
npm test
```

## Testing via browserstack
```bash
npm test:bs
```

## Linting
```bash
npm lint
```
