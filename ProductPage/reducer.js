/*
 *
 * ProductPage reducer
 *
 */

import { fromJS } from 'immutable'
import _ from 'lodash'
import {
  GET_PRODUCT_REQUEST,
  GET_PRODUCT_SUCCESS,
  GET_PRODUCT_FAILURE,
  GET_RELATED_REQUEST,
  GET_RELATED_SUCCESS,
  GET_RELATED_FAILURE,
  SELECT_IMAGE,
  SELECT_VARIATION,
  SET_ADDED_TO_CART,
  SET_SHRUNK,
  CLEAR_PRODUCT,
  TOGGLE_OPEN_DROPDOWN,
  GET_DEVICES_REQUEST,
  GET_DEVICES_SUCCESS,
  GET_DEVICES_FAILURE,
  START_CASTING_REQUEST,
  START_CASTING_SUCCESS,
  START_CASTING_FAILURE,
  // STOP_CASTING_REQUEST,
  STOP_CASTING_SUCCESS,
  // STOP_CASTING_FAILURE,
} from './constants'

const initialState = fromJS({
  getProduct: {
    error: null,
    pending: false,
  },
  getRelated: {
    error: null,
    pending: false,
  },
  product: null,
  related: [],
  image: 0,
  variation: 0,
  addedToCart: false,
  casting: {
    isCasting: false,
    device: null,
    screen: null,
    product: null,
    error: null,
    devices: [],
    pending: false,
    dropdownOpen: false,
  },
  shrunk: false,
})

function productPageReducer(state = initialState, action) {
  switch (action.type) {
    case GET_PRODUCT_REQUEST:
      return state.setIn(['getProduct', 'pending'], true)
    case GET_PRODUCT_SUCCESS:
      return state
        .setIn(['getProduct', 'pending'], false)
        .setIn(['getProduct', 'error'], null)
        .set('product', fromJS(action.payload))
    case GET_PRODUCT_FAILURE:
      return state
        .setIn(['getProduct', 'pending'], false)
        .setIn(['getProduct', 'error'], action.payload)
    case GET_RELATED_REQUEST:
      return state.setIn(['getRelated', 'pending'], true)
    case GET_RELATED_SUCCESS:
      return state
        .setIn(['getRelated', 'pending'], false)
        .setIn(['getRelated', 'error'], null)
        .set('related', fromJS(action.payload))
    case GET_RELATED_FAILURE:
      return state
        .setIn(['getRelated', 'pending'], false)
        .setIn(['getRelated', 'error'], action.payload)
    case SELECT_IMAGE:
      return state.set('image', action.payload)
    case SET_SHRUNK:
      return state.set('shrunk', action.payload)
    case SELECT_VARIATION:
      return state.set('variation', action.payload).set('image', 0)
    case SET_ADDED_TO_CART:
      return state.set('addedToCart', action.payload)
    case CLEAR_PRODUCT:
      const newState = _.chain(initialState.toJS())
      .omit('casting')
      .set('casting', state.toJS().casting)
      .value()
      return fromJS(newState)
    case TOGGLE_OPEN_DROPDOWN:
      return state.setIn(['casting', 'dropdownOpen'], !state.get('open'))
    case GET_DEVICES_REQUEST:
      return state.setIn(['casting', 'pending'], true)
    case GET_DEVICES_SUCCESS:
      return state
        .setIn(['casting', 'pending'], false)
        .setIn(['casting', 'devices'], action.payload)
    case GET_DEVICES_FAILURE:
      return state
        .setIn(['casting', 'pending'], false)
        .setIn(['casting', 'error'], action.payload)
    case START_CASTING_REQUEST:
      return state
        .setIn(['startCasting', 'pending'], true)
        .setIn(['casting', 'device'], action.payload.device)
        .setIn(['casting', 'screen'], action.payload.screen)
        .setIn(['casting', 'product'], action.payload.product)
    case START_CASTING_SUCCESS:
      return state
        .setIn(['casting', 'pending'], false)
        .setIn(['casting', 'isCasting'], true)
    case START_CASTING_FAILURE:
      return state
        .setIn(['casting', 'pending'], false)
        .setIn(['casting', 'error'], action.payload)
    case STOP_CASTING_SUCCESS:
      return state
        .setIn(['casting', 'device'], null)
        .setIn(['casting', 'screen'], null)
        .setIn(['casting', 'product'], null)
        .setIn(['casting', 'isCasting'], false)
    default:
      return state
  }
}

export default productPageReducer
