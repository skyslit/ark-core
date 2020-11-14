import { Ark } from './index';

const { createPackage, usePackage, createModule, useModule } = Ark;

describe('Core Functionalities', () => {
    let app = usePackage();

    const isolatedModule = createModule((deps) => {
        deps.app.setData('foreignModuleTestKey', deps.app.getModule('TestModule').testKey);
    });

    test('non-promise based module -> package registration is good', (done) => {
        createPackage(() => {
            useModule('TestModule', () => {
                app.setData('testKey', 'testValue');
            });
            useModule('SampleModule', () => {
                app.setData('sampleKey', 'sampleValue');
            });
            useModule('DepInjectionTestModule', isolatedModule);

            expect(app.getModule('TestModule')).not.toBe(undefined);
            expect(app.getModule('SampleModule')).not.toBe(undefined);
            expect(app.getModule('AnotherModule')).toBe(undefined);

            done();
        });
    });

    test('data set to correct module', () => {
        expect(app.getModule('TestModule').testKey).toBe('testValue');
        expect(app.getModule('SampleModule').sampleKey).toBe('sampleValue');
    });

    test('data not set to incorrect module', () => {
        expect(app.getModule('TestModule').sampleKey).not.toBe('sampleValue');
        expect(app.getModule('SampleModule').testKey).not.toBe('testValue');
    });

    test('dep injection and foreign module test', () => {
        expect(app.getModule('DepInjectionTestModule').foreignModuleTestKey).toBe('testValue');
    });

    const testPromise = () => new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve('have kept');
        }, 10);
    });

    const isolatedAsyncModule = createModule(async (deps) => {
        const v = await testPromise();
        deps.app.setData('afterPromise', 'have kept');
    });

    test('promise based module -> package registration is good', (done) => {
        app._hasPackageInitialized = false;
        createPackage(async () => {
            await useModule('AsyncTestModule', isolatedAsyncModule);
            done();
        });
    });

    test('async / promise module test', () => {
        expect(app.getModule('AsyncTestModule').afterPromise).toBe('have kept');
    });
});

describe('Failovers and Errors', () => {
    const app = usePackage();

    test('don\'t allow useModule outside package', async (done) => {
        const t = async () => await useModule('TestModule', () => { });
        expect(t).rejects.toBeTruthy();
        done();
    });

    test('don\'t allow duplicate packages', () => {
        const t = async () => {
            app._hasPackageInitialized = false;
            await createPackage(() => {});
            await createPackage(() => {});
        }
        expect(t).rejects.toThrow();
    });
});
