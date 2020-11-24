import { createPackage, usePackage, createModule, useModule, createController, useController } from './index';

describe('Controllers', () => {
    test('createController fn', () => {
        const TestService = createController((props) => {
            const {  } = props;
        });
    });

    test('useController fn', (done) => {
        type InputData = {
            inputA: string,
            inputB: number,
            inputC: string
        }

        type OutputData = {
            outputA: string,
            outputB: number,
            outputC: string
        }

        const TestService = createController<InputData, OutputData>((props) => {
            const { getInput, setOutput } = props;
            setOutput('outputA', 'TestOutputA');
            setOutput('outputB', getInput('inputB', 888));
            setOutput('outputC', getInput('inputC', 'DefTestArgC'));
        });

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
            })
            .finally(() => {
                done()
            });
        })
    })
});
