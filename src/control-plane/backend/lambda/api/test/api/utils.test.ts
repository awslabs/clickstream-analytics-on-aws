import { isEmpty } from '../../common/utils';

describe('Utils test', () => {

  it('Empty function', async () => {
    // String
    expect(isEmpty('')).toEqual(true);
    expect(isEmpty('x')).toEqual(false);
    expect(isEmpty('null')).toEqual(true);
    expect(isEmpty('undefined')).toEqual(true);

    // undefined and null
    expect(isEmpty(undefined)).toEqual(true);
    expect(isEmpty(null)).toEqual(true);

    // array and object
    expect(isEmpty([])).toEqual(true);
    expect(isEmpty([1])).toEqual(false);
    expect(isEmpty({})).toEqual(true);
    expect(isEmpty({ data: 1 })).toEqual(false);
  });

});