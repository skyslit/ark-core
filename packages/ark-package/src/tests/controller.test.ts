import { createPackage, usePackage, createModule, useModule, createController, useController, _, run } from '../index';

describe('Controllers', () => {
    let app = usePackage();

    type InputData = {
        inputA: string,
        inputB: number,
        inputC: string
    }

    type OutputData = {
        outputA: string,
        outputB: number,
        outputC: string,
        outputModuleName: string
    }

    app.registerGlobalService('test', (props) => ({
        executeTest: () => {
            return `TestExecuted`
        },
        getTestModuleId: () => props.moduleId
    }));

    const TestService = createController<InputData, OutputData>((props) => {
        const { getInput, setOutput, useGlobalService } = props;
        const { getTestModuleId } = useGlobalService('test');
        
        setOutput('outputA', 'TestOutputA');
        setOutput('outputB', getInput('inputB', 888));
        setOutput('outputC', getInput('inputC', 'DefTestArgC'));
        setOutput('outputModuleName', getTestModuleId())
    });


    test('createController fn', () => {
        const TestService = createController((props) => {
            const {  } = props;
        });
    });

    test('useController fn', (done) => {
        createPackage(() => {
            const { invoke } = useController();

            invoke(TestService, {
                inputC: 'TestArgC'
            })
            .then((v) => {
                // Normal setOutput
                expect(v.getOutput('outputA')).toEqual('TestOutputA');
                // Default setOutput
                expect(v.getOutput('outputB')).toEqual(888);
                // with default normal setOutput
                expect(v.getOutput('outputC')).toEqual('TestArgC');

                // Check global service module name
                expect(v.getOutput('outputModuleName')).toEqual('default');
            })
            .finally(() => {
                done()
            });
        })
    });

    test('useGlobalService within Controller', (done) => {
        _._hasPackageInitialized = false;
        createPackage(() => {
            useModule('test1', () => {
                const { invoke } = useController();
                run(() => {
                    return invoke(TestService, {
                        inputC: 'TestArgC'
                    })
                    .then((v) => {
                        expect(v.getOutput('outputModuleName')).toEqual('test1');
                        expect(v.getOutput('outputModuleName')).not.toEqual('test2');
                        return Promise.resolve(); 
                    });
                })
            })

            useModule('test2', () => {
                const { invoke } = useController();
                run(() => {
                    return invoke(TestService, {
                        inputC: 'TestArgC'
                    })
                    .then((v) => {
                        expect(v.getOutput('outputModuleName')).toEqual('test2');
                        expect(v.getOutput('outputModuleName')).not.toEqual('test1');
                        return Promise.resolve(); 
                    });
                })
            })
        }).finally(() => {
            done();
        })
    })
});
