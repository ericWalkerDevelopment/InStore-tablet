import { createSelector } from 'reselect'

/**
 * Direct selector to the productPage state domain
 */
const selectProductPageDomain = state => state.get('productPage')

/**
 * Other specific selectors
 */
const makeSelectGetProductRequest = () =>
  createSelector(selectProductPageDomain, substate =>
    substate.get('getProduct').toJS(),
  )

const makeSelectProduct = () =>
  createSelector(selectProductPageDomain, substate => {
    const product = substate.get('product')
    return product && product.toJS()
  })

const makeSelectGetRelatedRequest = () =>
  createSelector(selectProductPageDomain, substate =>
    substate.get('getRelated').toJS(),
  )

const makeSelectRelated = () =>
  createSelector(selectProductPageDomain, substate =>
    substate.get('related').toJS(),
  )

const makeSelectImage = () =>
  createSelector(selectProductPageDomain, substate => substate.get('image'))

const makeSelectVariation = () =>
  createSelector(selectProductPageDomain, substate => substate.get('variation'))

const makeSelectAddedToCart = () =>
  createSelector(selectProductPageDomain, substate =>
    substate.get('addedToCart'),
  )
const makeSelectShrunk = () =>
  createSelector(selectProductPageDomain, substate => substate.get('shrunk'))
const makeSelectCastingDetails = () =>
  createSelector(selectProductPageDomain, substate =>
    substate.get('casting').toJS(),
  )

/**
 * Default selector used by ProductPage
 */
const makeSelectProductPage = () =>
  createSelector(selectProductPageDomain, substate => substate.toJS())

export default makeSelectProductPage
export {
  selectProductPageDomain,
  makeSelectGetProductRequest,
  makeSelectProduct,
  makeSelectGetRelatedRequest,
  makeSelectRelated,
  makeSelectImage,
  makeSelectVariation,
  makeSelectAddedToCart,
  makeSelectCastingDetails,
  makeSelectShrunk,
}
