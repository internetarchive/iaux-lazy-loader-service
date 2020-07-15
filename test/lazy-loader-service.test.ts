import { expect, fixture, html } from '@open-wc/testing';
import { LazyLoaderService } from '../src/lazy-loader-service';
import { BundleType } from '../src/bundle-type';

const testServiceUrl = '/base/dist/test/test-service.js';

describe('Lazy Loader Service', () => {
  it('Initialized by default with document.head', async () => {
    const lazyLoader = new LazyLoaderService();
    await lazyLoader.loadScript({ src: testServiceUrl });
    const scripts = document.head.querySelectorAll('script');
    expect(scripts.length).to.equal(1);
  });

  describe('loadBundle', () => {
    it('Can load bundles', async () => {
      const container = (await fixture(html` <div></div> `)) as HTMLElement;
      const lazyLoader = new LazyLoaderService(container);
      await lazyLoader.loadBundle({
        module: testServiceUrl,
        nomodule: testServiceUrl,
      });

      const scripts = container.querySelectorAll('script');
      expect(scripts.length).to.equal(1);
    });
  });

  describe('loadScript', () => {
    it('Creates proper script tags in container', async () => {
      const container = (await fixture(html` <div></div> `)) as HTMLElement;
      const lazyLoader = new LazyLoaderService(container);

      await lazyLoader.loadScript({ src: testServiceUrl });

      const scripts = container.querySelectorAll('script');
      expect(scripts.length).to.equal(1);
    });

    it('Removes the script tag if the load fails', async () => {
      const container = (await fixture(html` <div></div> `)) as HTMLElement;
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
      const container = (await fixture(html` <div></div> `)) as HTMLElement;
      const lazyLoader = new LazyLoaderService(container);

      await lazyLoader.loadScript({ src: testServiceUrl });
      await lazyLoader.loadScript({ src: testServiceUrl });
      await lazyLoader.loadScript({ src: testServiceUrl });

      const scripts = container.querySelectorAll('script');
      expect(scripts.length).to.equal(1);
    });

    it('Loaded script is usable', async () => {
      const container = (await fixture(html` <div></div> `)) as HTMLElement;
      const lazyLoader = new LazyLoaderService(container);
      await lazyLoader.loadScript({ src: testServiceUrl });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (window as any).testService.getResponse();
      expect(result).to.equal('someresponse');
    });

    it('Can pass in attributes', async () => {
      const container = (await fixture(html` <div></div> `)) as HTMLElement;
      const lazyLoader = new LazyLoaderService(container);
      await lazyLoader.loadScript({
        src: testServiceUrl,
        attributes: [{ key: 'foo', value: 'bar' }],
      });

      const script = container.querySelector('script');
      const fooAttribute = script?.getAttribute('foo');
      expect(fooAttribute).to.equal('bar');
    });

    it('Can load modules', async () => {
      const container = (await fixture(html` <div></div> `)) as HTMLElement;
      const lazyLoader = new LazyLoaderService(container);
      await lazyLoader.loadScript({
        src: testServiceUrl,
        bundleType: BundleType.Module,
      });

      const script = container.querySelector('script');
      const typeAttribute = script?.getAttribute('type');
      expect(typeAttribute).to.equal('module');
    });

    // this is verifying that when a bunch of concurrent requests for a script get
    // made, that they all get their completion blocks called
    it('Calls multiple onloads if requested', async () => {
      const container = (await fixture(html` <div></div> `)) as HTMLElement;
      const lazyLoader = new LazyLoaderService(container);

      const count = 25;

      const loads = new Array(count).fill(false);

      async function loadScript(number: number): Promise<void> {
        await lazyLoader.loadScript({ src: testServiceUrl });
        loads[number] = true;
      }

      const promises = [];
      for (let i = 0; i < count; i++) {
        const promise = loadScript(i);
        promises.push(promise);
      }

      return Promise.all(promises).then(() => {
        for (let i = 0; i < count; i++) {
          expect(loads[i]).to.equal(true);
        }
      });
    });

    // this is verifying that when a bunch of concurrent requests for a script get
    // made, that they all get their completion blocks called
    it('Calls multiple onerrors if requested', async () => {
      const container = (await fixture(html` <div></div> `)) as HTMLElement;
      const lazyLoader = new LazyLoaderService(container);

      const count = 25;

      const loadFailed = new Array(count).fill(false);

      async function loadScript(number: number): Promise<void> {
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

      return Promise.all(promises).then(() => {
        for (let i = 0; i < count; i++) {
          expect(loadFailed[i]).to.equal(true);
        }
      });
    });
  });
});
