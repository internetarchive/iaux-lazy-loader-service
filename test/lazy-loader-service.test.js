import {
  expect, fixture, html
} from '@open-wc/testing';

import { LazyLoaderService } from '../lib/lazy-loader-service';

describe('Lazy Loader Service', () => {
  it('Initialized by default with document.head', async () => {
    const lazyLoader = new LazyLoaderService();
    expect(lazyLoader.container).to.equal(document.head);
  });

  it('Can be initialized with a container', async () => {
    const container = await fixture(html`
      <div></div>
    `);
    const lazyLoader = new LazyLoaderService(container);
    expect(lazyLoader.container).to.equal(container);
  });

  describe('loadBundle', () => {
    it('Can load bundles', async () => {
      const container = await fixture(html`
        <div></div>
      `);
      const lazyLoader = new LazyLoaderService(container);
      await lazyLoader.loadBundle({
        module: '/base/test/foo.js',
        nomodule: '/base/test/foo.js'
      });

      const scripts = container.querySelectorAll('script');
      expect(scripts.length).to.equal(1);
    });
  });

  describe('loadScript', () => {
    it('Creates proper script tags in container', async () => {
      const container = await fixture(html`
        <div></div>
      `);
      const lazyLoader = new LazyLoaderService(container);

      await lazyLoader.loadScript({ src: '/base/test/foo.js' });

      const scripts = container.querySelectorAll('script');
      expect(scripts.length).to.equal(1);
    });

    it('Removes the script tag if the load fails', async () => {
      const container = await fixture(html`
        <div></div>
      `);
      const lazyLoader = new LazyLoaderService(container);

      try {
        await lazyLoader.loadScript({ src: './blahblahnotfound.js' });
      } catch {
        // expected failure
      }

      const scripts = container.querySelectorAll('script');
      expect(scripts.length).to.equal(0);
    });

    it('Only loads scripts once if called multiple times', async () => {
      const container = await fixture(html`
        <div></div>
      `);
      const lazyLoader = new LazyLoaderService(container);

      await lazyLoader.loadScript({ src: '/base/test/foo.js' });
      await lazyLoader.loadScript({ src: '/base/test/foo.js' });
      await lazyLoader.loadScript({ src: '/base/test/foo.js' });

      const scripts = container.querySelectorAll('script');
      expect(scripts.length).to.equal(1);
    });

    it('Loaded script is usable', async () => {
      const container = await fixture(html`
        <div></div>
      `);
      const lazyLoader = new LazyLoaderService(container);
      await lazyLoader.loadScript({ src: '/base/test/foo.js' });

      const result = window.testService.getResponse();
      expect(result).to.equal('someresponse');
    });

    it('Can pass in attributes', async () => {
      const container = await fixture(html`
        <div></div>
      `);
      const lazyLoader = new LazyLoaderService(container);
      await lazyLoader.loadScript({
        src: '/base/test/foo.js',
        attributes: [{ key: 'foo', value: 'bar' }]
      });

      const script = container.querySelector('script');
      const fooAttribute = script.getAttribute('foo');
      expect(fooAttribute).to.equal('bar');
    });

    it('Can load modules', async () => {
      const container = await fixture(html`
        <div></div>
      `);
      const lazyLoader = new LazyLoaderService(container);
      await lazyLoader.loadScript({ src: '/base/test/foo.js', bundleType: 'module' });

      const script = container.querySelector('script');
      const typeAttribute = script.getAttribute('type');
      expect(typeAttribute).to.equal('module');
    });

    // this is verifying that when a bunch of concurrent requests for a script get
    // made, that they all get their completion blocks called
    it('Calls multiple onloads if requested', async () => {
      const container = await fixture(html`
        <div></div>
      `);
      const lazyLoader = new LazyLoaderService(container);

      const count = 25;

      let loads = new Array(count).fill(false);

      async function loadScript(number) {
        await lazyLoader.loadScript({ src: '/base/test/foo.js' });
        loads[number] = true;
      }

      const promises = [];
      for (let i = 0; i < count; i++) {
        const promise = loadScript(i);
        promises.push(promise);
      }

      return Promise.all(promises).then((values) => {
        for (let i = 0; i < count; i++) {
          expect(loads[i]).to.equal(true);
        }
      });
    });

    // this is verifying that when a bunch of concurrent requests for a script get
    // made, that they all get their completion blocks called
    it('Calls multiple onerrors if requested', async () => {
      const container = await fixture(html`
        <div></div>
      `);
      const lazyLoader = new LazyLoaderService(container);

      const count = 25;

      let loadFailed = new Array(count).fill(false);

      async function loadScript(number) {
        try {
          await lazyLoader.loadScript({ src: '/base/test/blahblah.js' });
        } catch {
          // we're expecting a failure here so this is successful
          loadFailed[number] = true;
        }
      }

      const promises = [];
      for (let i = 0; i < count; i++) {
        const promise = loadScript(i);
        promises.push(promise);
      }

      return Promise.all(promises).then((values) => {
        for (let i = 0; i < count; i++) {
          expect(loadFailed[i]).to.equal(true);
        }
      });
    });
  });
});
