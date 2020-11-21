import { Sequel, createPackage, usePackage, createModule, useModule } from './index';

declare global {
    namespace Ark {
        interface Modules {
            TestModule: any,
            SampleModule: any,
            AnotherModule: any,
            DepInjectionTestModule: any,
            AsyncTestModule: any,
        }
    }
}

describe('Sequel', () => {
    test('order of execution', (done) => {
        const testBin: any[] = [];

        const q = new Sequel();
        q.push({
            activator: () => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        testBin.push('TEST 1');
                        resolve()
                    }, 1000);
                })
            }
        });

        q.push({
            activator: () => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        testBin.push('TEST 2', 'TEST 3');
                        setTimeout(() => {
                            resolve()
                        }, 300);
                    }, 300);
                })
            }
        });

        q.push({
            activator: () => {
                testBin.push('TEST 4', 'TEST 5', 'TEST 6');
            }
        });

        setTimeout(() => {
            expect(testBin).toHaveLength(1);
            setTimeout(() => {
                expect(testBin).toHaveLength(3);
                setTimeout(() => {
                    expect(testBin).toEqual(['TEST 1', 'TEST 2', 'TEST 3', 'TEST 4', 'TEST 5', 'TEST 6']);
                    done();
                }, 500);
            }, 400);
        }, 1100);

        q.start();
    });

    test('before all', () => {
        const q = new Sequel();

        let counter = 0;
        let result = 0;

        q.push({
            activator: () => {
                result = counter;
            }
        });

        q.start({
            before: () => {
                counter++;
            }
        })
        .finally(() => {
            expect(result).toEqual(1);
        });
    });

    test('after all', () => {
        const q = new Sequel();
        let result = 0;

        q.push({
            activator: () => {
                result = 1;
            }
        });

        q.start({
            after: () => {
                result++;
            }
        })
        .finally(() => {
            expect(result).toEqual(2);
        });
    });

    test('before each', (done) => {
        const q = new Sequel();
        let counter = 0;
        let result: number[] = [];

        q.push({
            activator: () => {
                result.push(counter);
            }
        });

        q.push({
            activator: () => new Promise((resolve) => {
                setTimeout(() => {
                    result.push(counter);
                    resolve();
                }, 300);
            })
        });

        q.push({
            activator: () => {
                result.push(counter);
            }
        });

        q.start({
            beforeEach: () => {
                counter++;
            }
        })
        .finally(() => {
            expect(counter).toEqual(3);
            expect(counter).toEqual(3);
            expect(result).toEqual([1, 2, 3]);
            done();
        });
    });

    test('after each', (done) => {
        const q = new Sequel();
        let counter = 0;
        let result: number[] = [];

        q.push({
            name: '1',
            activator: () => {
                result.push(counter);
            }
        });

        q.push({
            name: '2',
            activator: () => new Promise((resolve) => {
                setTimeout(() => {
                    result.push(counter);
                    resolve();
                }, 300);
            })
        });

        q.push({
            name: '3',
            activator: () => {
                result.push(counter);
            }
        });

        q.start({
            beforeEach: () => {
                counter++;
            },
            afterEach: () => {
                result.splice(result.indexOf(counter), 1);
            }
        })
        .finally(() => {
            expect(counter).toEqual(3);
            expect(counter).toEqual(3);
            expect(result).toEqual([]);
            done();
        });
    });
})

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
