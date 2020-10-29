import _ from 'lodash'
import Analytics from 'appcenter-analytics'
import { delay } from 'redux-saga'
import { takeLatest, call, put, select } from 'redux-saga/effects'
import * as log from 'loglevel'
import request from '../../utils/request'
import config from '../../config'
import logger from '../../utils/logger'
import { ADD_TO_CART } from '../App/constants'
import { makeSelectToken, makeSelectCurrentStore } from '../App/selectors'
import {
  GET_PRODUCT_REQUEST,
  GET_RELATED_REQUEST,
  GET_DEVICES_REQUEST,
  START_CASTING_REQUEST,
  STOP_CASTING_REQUEST,
} from './constants'
import {
  getProductSuccess,
  getProductFailure,
  getRelatedSuccess,
  getRelatedFailure,
  selectVariationAction,
  setAddedToCartAction,
  getDevicesSuccess,
  getDevicesFailure,
  startCastingSuccess,
  startCastingFailure,
  stopCastingSuccess,
  stopCastingFailure,
} from './actions'

const getVariationTypes = (variations, types = {}) => {
  const variation = _.head(variations)
  if (!variation) {
    return _.mapValues(types, (typeList, type) => {
      if (type === 'size') {
        return _.sortBy(typeList, size => {
          switch (size) {
            case 'XS':
              return 1
            case 'S':
              return 2
            case 'M':
              return 3
            case 'L':
              return 4
            case 'XL':
              return 5
            case 'XXL':
              return 6
            case 'XXXL':
              return 7
            default:
              return 8
          }
        })
      }
      if (type === 'weight' || type === 'volume' || type === 'itemsPerPack') {
        return typeList.sort((a, b) => a - b)
      }
      return typeList.sort()
    })
  }
  const nextTypes = types
  if (variation.itemsPerPack) {
    const itemsPerPack = _.get(types, 'itemsPerPack') || []
    nextTypes.itemsPerPack = _.union(itemsPerPack, [variation.itemsPerPack])
  }
  const netContentUnit = _.get(variation, ['netContent', 'unit'])
  const netContentValue = _.get(variation, ['netContent', 'value'])
  if (netContentUnit && netContentUnit.endsWith('g')) {
    const weight = _.get(types, 'weight') || []
    nextTypes.weight = _.union(weight, [netContentValue])
  }
  if (netContentUnit === 'mL') {
    const volume = _.get(types, 'volume') || []
    nextTypes.volume = _.union(volume, [netContentValue])
  }
  if (variation.variationType) {
    const variationType = _.get(types, 'variationType') || []
    nextTypes.variationType = _.union(variationType, [variation.variationType])
  }
  if (variation.size) {
    const size = _.get(types, 'size') || []
    nextTypes.size = _.union(size, [variation.size])
  }
  if (variation.colour) {
    const colour = _.get(types, 'colour') || []
    nextTypes.colour = _.unionWith(colour, [variation.colour], _.isEqual)
  }
  return getVariationTypes(_.tail(variations), nextTypes)
}

// Individual exports for testing
export function* getProduct(action) {
  const productId = action.payload
  const requestURL = `${config.API_BASE}/products/${productId}`

  const storeId = yield select(makeSelectCurrentStore())
  try {
    const product = yield call(request, requestURL)
    product.variations = _.filter(
      product.variations,
      v => _.get(v, ['availability', storeId, 'quantity']) > 0,
    )
    product.variationTypes = getVariationTypes(product.variations)
    yield put(getProductSuccess(product))
    const variation = _.findIndex(product.variations, v =>
      _.reduce(
        product.variationTypes,
        (result, values, type) => {
          const param =
            type === 'weight' || type === 'volume'
              ? ['netContent', 'value']
              : type
          return result && _.isEqual(_.get(v, param), _.head(values))
        },
        true,
      ),
    )
    Analytics.trackEvent('Clicked Product', {
      ProductName: product.name,
      ProductSupplier: product.supplier,
      ProductID: product.id,
      ProductCategory: product.category,
    })
    yield logger(config.ANALYTICS.CLICKED_PRODUCT, {
      name: product.name,
      supplier: product.supplier,
      id: product.id,
      category: product.category,
    })
    yield put(selectVariationAction(variation))
  } catch (err) {
    log.debug(err.message)
    log.trace(err.stack)
    yield put(getProductFailure(_.get(err, ['response', 'status']) || 1))
  }
}

export function* getRelated(action) {
  const productId = action.payload
  const requestURL = `${config.API_BASE}/products/${productId}/related`

  try {
    const products = yield call(request, requestURL)
    yield put(getRelatedSuccess(products))
  } catch (err) {
    log.debug(err.message)
    log.trace(err.stack)
    yield put(getRelatedFailure(_.get(err, ['response', 'status']) || 1))
  }
}
export function* getDevices(action) {
  const token = yield select(makeSelectToken())
  const store = action.payload
  const requestURL = `${config.API_BASE}/cms/devices?store=${store}`
  const options = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
  try {
    const devices = yield call(request, requestURL, options)
    yield put(getDevicesSuccess(devices))
  } catch (err) {
    yield put(getDevicesFailure(err))
  }
}

export function* startCasting(action) {
  const token = yield select(makeSelectToken())
  const { device, screen, product } = action.payload
  const requestURL =
    `${config.API_BASE}/cms/devices/` +
    `${device}/screen/${screen}/override/${product}`
  const options = {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
  try {
    yield call(request, requestURL, options)
    yield put(startCastingSuccess())
  } catch (err) {
    yield put(startCastingFailure(err))
  }
}

export function* stopCasting(action) {
  const token = yield select(makeSelectToken())
  const { device, screen } = action.payload
  const requestURL = `${
    config.API_BASE
  }/cms/devices/${device}/screen/${screen}/override`
  const options = {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }

  try {
    yield call(request, requestURL, options)
    yield put(stopCastingSuccess())
  } catch (err) {
    yield put(stopCastingFailure(err))
  }
}
export function* addedToCart() {
  yield put(setAddedToCartAction(true))
  yield delay(5000)
  yield put(setAddedToCartAction(false))
}

export default function* defaultSaga() {
  yield takeLatest(GET_PRODUCT_REQUEST, getProduct)
  yield takeLatest(GET_RELATED_REQUEST, getRelated)
  yield takeLatest(ADD_TO_CART, addedToCart)
  yield takeLatest(GET_DEVICES_REQUEST, getDevices)
  yield takeLatest(START_CASTING_REQUEST, startCasting)
  yield takeLatest(STOP_CASTING_REQUEST, stopCasting)
}
