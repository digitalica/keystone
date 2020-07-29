const globby = require('globby');
const path = require('path');
const { multiAdapterRunners, setupServer } = require('@keystonejs/test-utils');
const { createItems } = require('@keystonejs/server-side-graphql-client');

describe('Fields', () => {
  const testModules = globby.sync(`packages/fields/src/types/**/test-fixtures.js`, {
    absolute: true,
  });
  testModules.push(path.resolve('packages/fields/tests/test-fixtures.js'));

  multiAdapterRunners().map(({ runner, adapterName }) =>
    describe(`${adapterName} adapter`, () => {
      testModules
        .map(require)
        .filter(({ name }) => true || name === 'Uuid')
        .forEach(mod => {
          const listName = 'test';
          const keystoneTestWrapper = (testFn = () => {}) =>
            runner(
              () => {
                const createLists = keystone => {
                  // Create a list with all the fields required for testing
                  const fields = mod.getTestFields();

                  keystone.createList(listName, { fields });
                };
                return setupServer({ adapterName, createLists });
              },
              async ({ keystone, ...rest }) => {
                // Populate the database before running the tests
                await createItems({
                  keystone,
                  listKey: listName,
                  items: mod.initItems().map(x => ({ data: x })),
                  context: keystone.createContext({ schemaName: 'testing' }),
                });

                return testFn({ keystone, listName, adapterName, ...rest });
              }
            );

          describe(`${mod.name} field`, () => {
            if (mod.crudTests) {
              describe(`CRUD operations`, () => {
                mod.crudTests(keystoneTestWrapper);
              });
            } else {
              test.todo('CRUD operations - tests missing');
            }

            if (mod.filterTests) {
              describe(`Filtering`, () => {
                mod.filterTests(keystoneTestWrapper);
              });
            } else {
              test.todo('Filtering - tests missing');
            }
          });
        });
    })
  );
});
