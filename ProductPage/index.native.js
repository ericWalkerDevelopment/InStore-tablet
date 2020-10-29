/* eslint-disable */
import Config from 'react-native-config'

let entry
if (Config.TARGET === 'mobile') {
  entry = require('./index.mobile.native.js').default
} else {
  entry = require('./index.tablet.native.js').default
}

export default entry
