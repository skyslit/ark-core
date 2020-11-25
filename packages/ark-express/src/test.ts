import { createPackage, useModule, usePackage } from '@skyslit/ark-package';
import request from 'supertest';
import { useExpress, useModel, useRoute } from '.';

describe('Express', () => {
    const _ = usePackage();
    test('Integration Test', () => {
        const packageCreator = () => createPackage(() => {
            useExpress();
            useRoute('get', '/package-level', (req, res) => {
                res.send('OK');
            });

            useModule('accounts', () => {
                useRoute('get', '/accounts', (req, res) => {
                    res.send('OK');
                });
            });
        });

        expect(packageCreator).not.toThrowError();
    });

    test('package level request test', (done) => {
        const r = () => request(_.app)
            .get('/package-level')
            .then((res) => {
                expect(res.status).toBe(200);
            })
            .finally(done);
        expect(r).not.toThrowError();
    });

    test('module level request test', (done) => {
        const r = () => request(_.app)
            .get('/accounts')
            .then((res) => {
                expect(res.status).toBe(200);
            })
            .finally(done);
        expect(r).not.toThrowError();
    });
})