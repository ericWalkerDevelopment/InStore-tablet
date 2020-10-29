/*
 *
 * ProductPage actions
 *
 */

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
  STOP_CASTING_REQUEST,
  STOP_CASTING_SUCCESS,
  STOP_CASTING_FAILURE,
} from './constants'

export function getProductRequest(productId) {
  return {
    type: GET_PRODUCT_REQUEST,
    payload: productId,
  }
}

export function getProductSuccess(product) {
  return {
    type: GET_PRODUCT_SUCCESS,
    payload: product,
  }
}

export function getProductFailure(error) {
  return {
    type: GET_PRODUCT_FAILURE,
    payload: error,
  }
}

export function getRelatedRequest(productId) {
  return {
    type: GET_RELATED_REQUEST,
    payload: productId,
  }
}

export function getRelatedSuccess(related) {
  return {
    type: GET_RELATED_SUCCESS,
    payload: related,
  }
}

export function getRelatedFailure(error) {
  return {
    type: GET_RELATED_FAILURE,
    payload: error,
  }
}

export function selectImageAction(index) {
  return {
    type: SELECT_IMAGE,
    payload: index,
  }
}

export function selectVariationAction(variation) {
  return {
    type: SELECT_VARIATION,
    payload: variation,
  }
}

export function setAddedToCartAction(payload) {
  return {
    type: SET_ADDED_TO_CART,
    payload,
  }
}

export function setShrunkHeader(shrunk) {
  return {
    type: SET_SHRUNK,
    payload: shrunk,
  }
}
export function clearProductAction() {
  return {
    type: CLEAR_PRODUCT,
  }
}

export function toggleDropdownState() {
  return {
    type: TOGGLE_OPEN_DROPDOWN,
  }
}

export function startCastingRequest(device, screen, product) {
  return {
    type: START_CASTING_REQUEST,
    payload: {
      device,
      screen,
      product,
    },
  }
}

export function startCastingSuccess() {
  return {
    type: START_CASTING_SUCCESS,
  }
}

export function startCastingFailure(error) {
  return {
    type: START_CASTING_FAILURE,
    payload: error,
  }
}

export function stopCastingRequest(device, screen) {
  return {
    type: STOP_CASTING_REQUEST,
    payload: {
      device,
      screen,
    },
  }
}
export function stopCastingSuccess() {
  return {
    type: STOP_CASTING_SUCCESS,
  }
}
export function stopCastingFailure() {
  return {
    type: STOP_CASTING_FAILURE,
  }
}

export function getDevicesRequest(store) {
  return {
    type: GET_DEVICES_REQUEST,
    payload: store,
  }
}

export function getDevicesSuccess(devices) {
  return {
    type: GET_DEVICES_SUCCESS,
    payload: devices,
  }
}

export function getDevicesFailure(error) {
  return {
    type: GET_DEVICES_FAILURE,
    payload: error,
  }
}
