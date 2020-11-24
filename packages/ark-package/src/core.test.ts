import { createPackage, usePackage, createModule, useModule } from './index';

type TestService = {
    executeTest: () => string
}

declare global {
    namespace Ark {
        interface Modules {
            TestModule: any,
            SampleModule: any,
            AnotherModule: any,
            DepInjectionTestModule: any,
            AsyncTestModule: any,
        }
        interface GlobalServices {
            test: TestService
        }
    }
}

describe('Core Functionalities', () => {
    let app = usePackage();

    const isolatedModule = createModule((deps) => {
        deps.app.setData('foreignModuleTestKey', deps.app.getModule('TestModule').testKey);
    });

    test('module -> package registration is good', (done) => {
        createPackage(() => {
            useModule('TestModule', () => {
                app.setData('testKey', 'testValue');
            });
            useModule('SampleModule', () => {
                app.setData('sampleKey', 'sampleValue');
            });
            useModule('DepInjectionTestModule', isolatedModule);
        })
        .finally(() => {
            expect(app.getModule('TestModule')).not.toBe(undefined);
            expect(app.getModule('SampleModule')).not.toBe(undefined);
            expect(app.getModule('AnotherModule')).toBe(undefined);

            done();
        })
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
});

describe('Global Services', () => {
    let app = usePackage();

    test('register new service', () => {
        let result: string = null;

        app.registerGlobalService('test', {
            executeTest: () => {
                return 'TestSuccess';
            }
        });
        const serviceRef = app.useGlobalService('test');
        result = serviceRef.executeTest();

        expect(result).toEqual('TestSuccess');
    });

    test('avoid duplicate service registration', () => {
        const t = () => app.registerGlobalService('test', {
            executeTest: () => {
                return 'Hello';
            }
        });
        expect(t).toThrowError();
    })

    test('extend service', () => {
        let result: string = null;

        app.extendGlobalService('test', (svc) => ({
            executeTest: () => {
                return `Extended${svc.executeTest()}`
            }
        }));
        
        const serviceRef = app.useGlobalService('test');
        result = serviceRef.executeTest();

        expect(result).toEqual('ExtendedTestSuccess');
    });

    test('avoid extending unregister services', () => {
        const t = () => app.extendGlobalService('test1' as any, () => ({
            executeTest: () => {
                return 'ExtendedTestSuccess';
            }
        }));

        expect(t).toThrowError();
    })
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
