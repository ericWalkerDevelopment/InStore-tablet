import React from 'react'
import Analytics from 'appcenter-analytics'
import _ from 'lodash'
import { ScrollView, View, DrawerLayoutAndroid, Dimensions } from 'react-native'
import qs from 'qs'
import { Link } from 'react-router-native'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
// import Icon from 'react-native-vector-icons/Feather'
// import { createStructuredSelector } from 'reselect'
import { compose } from 'redux'
import styled from 'styled-components'
import {
  ProductImage,
  ProductCard,
  Spinner,
  // ProductDetails,
  ProductPageDetails,
  // Specifications,
} from '@hifyreinc/faf-native-components'
import { Dropdown } from 'react-native-material-dropdown'
import {
  BRAND_PRIMARY,
  BRAND_SECONDARY,
  NATIVE_GUTTER,
  NATIVE_GUTTER_HALF,
} from '@hifyreinc/faf-styles'
import injectSaga from '../../utils/injectSaga'
import injectReducer from '../../utils/injectReducer'
import getCovaImage from '../../utils/getCovaImage'
import {
  makeSelectCurrentStore,
  makeSelectCartCount,
  makeSelectQuantityInCart,
  makeSelectPromotions,
} from '../App/selectors'
import {
  selectStoreAction,
  addToCartAction,
  setDeviceOrientationAction,
} from '../App/actions'
import {
  getProductRequest,
  getRelatedRequest,
  selectVariationAction,
  clearProductAction,
  selectImageAction,
  decrementAction,
  incrementAction,
  getDevicesRequest,
  startCastingRequest,
  stopCastingRequest,
  setShrunkHeader,
} from './actions'
import {
  makeSelectProduct,
  makeSelectRelated,
  makeSelectVariation,
  makeSelectAddedToCart,
  makeSelectImage,
  makeSelectCastingDetails,
  makeSelectShrunk,
} from './selectors'
import reducer from './reducer'
import saga from './saga'
import config from '../../config'
import VariationSelector from '../../components/VariationSelector'
// import CategoriesNav from '../../components/CategoriesNav'
import formatPrice from '../../compliance/formatPrice'
import getSalePrice from '../../utils/getSalePrice'
import Header from '../CategoriesPage/Header'

// import OrderForm from '../OrderForm'

export class ProductPage extends React.PureComponent {
  constructor(props) {
    super(props)
    this.renderDetails = this.renderDetails.bind(this)
    this.renderVariationSelectors = this.renderVariationSelectors.bind(this)
    this.getPrice = this.getPrice.bind(this)
    this.makeVariationObject = this.makeVariationObject.bind(this)
    this.handleVariationChange = this.handleVariationChange.bind(this)
    this.renderPills = this.renderPills.bind(this)
    this.openDrawer = this.openDrawer.bind(this)
    this.stopCasting = this.stopCasting.bind(this)
    this.setShrunk = this.setShrunk.bind(this)
    this.handleAccessoryVariationChange = this.handleAccessoryVariationChange.bind(
      this,
    )
    this.getImage = this.getImage.bind(this)
    this.renderVariations = this.renderVariations.bind(this)
  }
  componentDidMount() {
    const {
      getProduct,
      getRelated,
      match,
      getDevices,
      currentStore,
      castingDetails,
    } = this.props

    const productID = match.params.id
    getDevices(currentStore || config.ONLINE_LOCATION_ID)
    getProduct(productID)
    getRelated(productID)
    const { isCasting, device, screen } = castingDetails
    if (isCasting) {
      this.startCasting(device, screen)
    }
  }
  componentDidUpdate(prevProps) {
    const { getProduct, getRelated, match, castingDetails } = this.props
    if (prevProps.match.params.id !== match.params.id) {
      const { isCasting, device, screen } = castingDetails
      const { id } = match.params
      getProduct(id)
      getRelated(id)
      this.list.scrollTo({ y: 0, animated: true })
      if (isCasting) {
        this.startCasting(device, screen)
      }
    }
  }
  isPotrait() {
    const { height, width } = Dimensions.get('screen')
    return height >= width
  }
  orientationHandler() {
    const { setOrientation } = this.props
    this.isPotrait() ? setOrientation('potrait') : setOrientation('landscape') //eslint-disable-line
  }
  getImage(product) {
    const image = _.chain(product)
      .get('variations')
      .map(v => _.get(v, ['primaryImage']))
      .toPairs()
      .filter(pair => pair[1])
      .fromPairs()
      .valuesIn()
      .head()
      .value()
    return image
  }
  componentWillUnmount() {
    this.props.clearProduct()
  }
  setShrunk(event) {
    const { setShrunk } = this.props
    if (event >= 20) {
      setShrunk(true)
    } else {
      setShrunk(false)
    }
  }
  makeVariationObject(variation) {
    const netContent = _.get(variation, ['netContent', 'value'])
    const netContentUnit = _.get(variation, ['netContent', 'unit'])
    const itemsPerPack = _.get(variation, 'itemsPerPack')
    return {
      size: _.get(variation, 'size'),
      colour: _.get(variation, 'colour'),
      itemsPerPack: itemsPerPack && itemsPerPack,
      variationType: _.get(variation, 'variationType'),
      weight:
        netContentUnit && netContentUnit.endsWith('g') ? netContent : undefined,
      volume: netContentUnit === 'mL' ? netContent : undefined,
    }
  }
  /**
   * Change variant
   * @params type - Type of variant {size, colour, weight, volume}
   * @params selected - Product value { e.g 1g, 'XL' etc}
   */
  handleVariationChange(type, selected) {
    const { product, variation, selectVariation } = this.props
    const variationSpecs = this.makeVariationObject(
      _.get(product, ['variations', variation]),
    )
    const nextSpecs = _.set(variationSpecs, type, selected)
    Analytics.trackEvent('Products Variations Change', {
      product: _.get(product, ['name']) || '',
      productId: _.get(product, ['id']) || '',
      size: _.get(nextSpecs, ['size']) || '',
      colour: _.get(nextSpecs, ['colour', 'name']) || '',
      itemsPerPack: _.get(nextSpecs, ['itemsPerPack']) || '',
      variationType: _.get(nextSpecs, ['variationType']) || '',
      volume: _.get(nextSpecs, ['volume']) || '',
      weight: _.get(nextSpecs, ['weight']) || '',
    })
    const nextVariation = _.findIndex(product.variations, v =>
      _.isEqual(this.makeVariationObject(v), nextSpecs),
    )
    if (nextVariation >= 0) selectVariation(nextVariation)
  }
  handleAccessoryVariationChange(name) {
    const { product, selectVariation } = this.props
    const selected = _.findIndex(product.variations, v => v.name === name)
    Analytics.trackEvent('Products Variations Change (Accessories)', {
      ProductName: _.get(product, ['name']),
      ProductID: _.get(product, ['id']),
      VariationID: _.get(product, ['variations', selected, 'id']),
      VariationName: _.get(product, ['variations', selected, 'name']),
    })
    if (selected >= 0) selectVariation(selected)
  }
  getPrice(product) {
    const { currentStore } = this.props
    const storeId = currentStore || config.ONLINE_LOCATION_ID

    const prices = _.chain(product)
      .get('variations')
      .map(v => _.get(v, ['pricing', storeId, 'regular']))
      .value()

    const multiplePrices = _.uniq(prices).length === 1
    const price = multiplePrices ? _.head(prices) : _.head(prices.sort())
    const formatted = formatPrice(price, {})

    return formatted || ''
  }

  renderVariationSelectors() {
    const { product, variation } = this.props
    if (product) {
      if (product.variations.length <= 0) return null
      const v = _.get(product, ['variations', variation])
      return _.chain(product)
        .get('variationTypes')
        .toPairs()
        .sortBy(([type]) => type)
        .map(([type, variations]) => {
          const labelImport = _.snakeCase(type)
            .split('_')
            .join(' ')
          const label =
            labelImport === 'variation type' ? 'options' : labelImport
          const param =
            type === 'weight' || type === 'volume'
              ? ['netContent', 'value']
              : type
          const unit =
            type === 'weight' || type === 'volume'
              ? _.get(v, ['netContent', 'unit'])
              : undefined
          return (
            <VariationSelector
              type={type}
              label={label}
              unit={unit}
              param={param}
              variations={variations}
              selected={_.get(v, param)}
              onChange={this.handleVariationChange}
            />
          )
        })
        .value()
    }
    return null
  }
  renderRelated() {
    const { related } = this.props
    if (related.length === 0) {
      return null
    }
    const { height, width } = Dimensions.get('window')
    const widescreen = height / width < 0.6
    const portrait = height / width > 1
    /* eslint-disable */
    const cardWidth = portrait ? '32%' : '32%' /* (widescreen ? '24.2%' : '23.8%') */
    /* eslint-enable */
    return (
      <RelatedWrap portrait={portrait}>
        <RelatedHeading>Related Products</RelatedHeading>
        <RelatedProductWrap widescreen={widescreen} portrait={portrait}>
          {related.map(product => (
            <ProductCard
              key={product.id + product.name}
              width={cardWidth}
              size={15}
              tablet
              image={getCovaImage(this.getImage(product), 800)}
              subcategory={product.subCategory}
              id={product.id}
              name={product.name}
              price={this.getPrice(product)}
            />
          ))}
        </RelatedProductWrap>
      </RelatedWrap>
    )
  }

  renderPills() {
    const { product } = this.props
    const { height, width } = Dimensions.get('window')
    const portrait = height / width > 1
    const groups = _.chain([
      ['subCategory', product.subCategory],
      ['strainType', product.strainType],
      ['subStrainType', product.subStrainType],
      ['accessoryType', product.accessoryType],
    ])
      .concat(_.map(product.tags, t => ['tag', t]) || [])
      .filter(g => g[1])
      .map(([key, group]) => {
        const q =
          key === 'tag'
            ? qs.stringify({ tag: group })
            : qs.stringify({ [key]: group })
        return (
          <Link
            key={group}
            component={Pill}
            to={{
              pathname: `/category/${product.category}`,
              search: `?${q}`,
            }}
          >
            <PillText>{group}</PillText>
          </Link>
        )
      })
      .value()
    return <PillsContainer portrait={portrait}>{groups}</PillsContainer>
  }
  renderDetails() {
    const {
      product,
      selectImage,
      selectedImage,
      variation,
      currentStore,
      shrunk,
      promotions,
    } = this.props
    if (product) {
      const images = _.get(product, ['variations', variation, 'images']) || []
      const salePrice = getSalePrice(
        currentStore,
        promotions,
        product,
        variation,
        {
          formatted: true,
        },
      )
      const { height, width } = Dimensions.get('window')
      const widescreen = height / width < 0.6
      const portrait = height / width > 1
      const formattedPrice = formatPrice(
        _.get(product, [
          'variations',
          variation,
          'pricing',
          currentStore || config.ONLINE_LOCATION_ID,
          'regular',
        ]),
      )
      return (
        <ProductWrapper portrait={portrait}>
          <TopWrap shrunk={shrunk} widescreen={widescreen} portrait={portrait}>
            {portrait && (
              <ProductContainer>
                <ProductImage
                  masterImage={product.image}
                  selectImage={selectImage}
                  selectedImage={getCovaImage(images[selectedImage], 1040)}
                  images={images}
                  shrunk={shrunk}
                  widescreen={widescreen}
                  portrait={portrait}
                />
              </ProductContainer>
            )}
            <PaddingColumnRight
              shrunk={shrunk}
              widescreen={widescreen}
              portrait={portrait}
            >
              <ProductName
                widescreen={widescreen}
                shrunk={shrunk}
                portrait={portrait}
              >
                {_.get(product, ['name'])}
              </ProductName>
              {this.renderPills()}
              <PriceWrap>
                {salePrice && (
                  <Price shrunk={shrunk} portrait={portrait}>
                    {salePrice}
                  </Price>
                )}
                {salePrice ? (
                  <StruckPrice>{formattedPrice}</StruckPrice>
                ) : (
                  <Price shrunk={shrunk} portrait={portrait}>
                    {formattedPrice}
                  </Price>
                )}
              </PriceWrap>
            </PaddingColumnRight>
          </TopWrap>
          {!portrait && (
            <PaddingColumnLeft
              shrunk={shrunk}
              widescreen={widescreen}
              portrait={portrait}
            >
              <ProductImage
                masterImage={product.image}
                selectImage={selectImage}
                selectedImage={getCovaImage(images[selectedImage], 1040)}
                images={images}
                shrunk={shrunk}
                widescreen={widescreen}
              />
            </PaddingColumnLeft>
          )}
          {/* eslint-disable */}
          <ScrollView
            ref={ref => (this.list = ref)}
            scrollEventThrottle={16}
            onScroll={event =>
              this.setShrunk(event.nativeEvent.contentOffset.y)
            }
          >
            <BottomWrap
              shrunk={shrunk}
              widescreen={widescreen}
              portrait={portrait}
            >
              <SpecificsWrap>
                <ProductPageDetails
                  thc={_.get(product, ['variations', variation, 'thcContent'])}
                  cbd={_.get(product, ['variations', variation, 'cbdContent'])}
                  strain={_.get(product, ['strain'])}
                  brand={_.get(product, ['brand'])}
                  supplier={_.get(product, ['licensedProducer'])}
                  terpenes={_.get(product, [
                    'variations',
                    variation,
                    'terpenes',
                  ])}
                />
              </SpecificsWrap>
              {this.renderVariations()}
              {product.fullDescription ? (
                <View>
                  <DescriptionTitle>DESCRIPTION</DescriptionTitle>
                  <Description>{product.fullDescription}</Description>
                </View>
              ) : (
                <Description />
              )}
            </BottomWrap>
            {/* this.renderRelated() */}
          </ScrollView>
          {/* <OrderForm /> */}
        </ProductWrapper>
      )
    }
    return <Spinner />
  }
  openDrawer() {
    const open = this.drawer
    open.openDrawer()
  }
  renderDevices(device, details) {
    return (
      <DeviceContainer key={device.id}>
        <DeviceTitle size={18}>{device.name}</DeviceTitle>
        {device.screens.length > 0 && (
          <ScreensContainer>
            {device.screens.map(screen => (
              <Screen
                key={screen}
                onPress={() => this.startCasting(device.id, screen)}>
                <ScreenTitle>{screen}</ScreenTitle>
              </Screen>
            ))}
          </ScreensContainer>
        )}
      </DeviceContainer>
    )
  }
  startCasting(device, screen) {
    const { initiateCast, match } = this.props
    initiateCast(device, screen, match.params.id)

  }
  stopCasting() {
    const { castingDetails, cancelCast } = this.props
    cancelCast(castingDetails.device, castingDetails.screen)
  }
  renderVariations(){
    const { product, variation } = this.props
    if (product.category === 'Accessories' && product.variations.length >= 1) {
      return (
        <DropdownWrap>
          <Dropdown
            data={product.variations}
            containerStyle={{
              marginBottom: NATIVE_GUTTER,
              marginTop: -22,
            }}
            valueExtractor={({ name }) => name}
            lineWidth={0}
            rippleOpacity={0}
            pickerStyle={{
              marginTop: 80,
              width: '60%',
              marginLeft: -4,
              backgroundColor: '#f6f6f6',
            }}
            fontSize={18}
            dropdownPosition={0}
            value={_.get(product, ['variations', variation, 'name'])}
            onChangeText={e => {this.handleAccessoryVariationChange(e)}}
          />
        </DropdownWrap>
      )
    }
    return (

      <VariationContainer>
        {this.renderVariationSelectors()}
      </VariationContainer>

    )
  }
  render() {
    const { product, history, castingDetails } = this.props
    const navigationView = (
      <DevicesContainer>
          {castingDetails.isCasting && (
            <View style={{ marginBottom: 10 }}>
              <Screen

                width={'100%'}
                onPress={() => {
                  this.stopCasting()
                }}
              >
                <ScreenTitle>Stop Casting</ScreenTitle>
              </Screen>
            </View>

          )}
        <DeviceDrawerTitle>Screen Casting</DeviceDrawerTitle>
        {castingDetails.devices.map(d => this.renderDevices(d, castingDetails))}
      </DevicesContainer>
    )
    return (
      <DrawerLayoutAndroid
        drawerWidth={400}
        ref={c => {
          this.drawer = c
        }}
        drawerPosition={DrawerLayoutAndroid.positions.Right}
        renderNavigationView={() => navigationView}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'white',
          }}
        >
          <View style={{ flexDirection: 'row' }}>
            <Header
              selectedCategory={product && product.category}
              selectedSubCategory={product && product.subCategory}
              history={history}
              productPage
              openMenu={this.openDrawer}
            />
          </View>
          <MainContainer>
            {this.renderDetails()}
          </MainContainer>
        </View>
      </DrawerLayoutAndroid>
    )
  }
}

ProductPage.propTypes = {
  selectImage: PropTypes.func,
  selectedImage: PropTypes.number.isRequired,
  currentStore: PropTypes.string,
  categories: PropTypes.array,
  product: PropTypes.object,
  promotions: PropTypes.array,
  // product: PropTypes.arrayOf(
  //   PropTypes.shape({
  //     id: PropTypes.string.isRequired,
  //     name: PropTypes.string.isRequired,
  //     image: PropTypes.string.isRequired,
  //     category: PropTypes.string.isRequired,
  //     subCategory: PropTypes.string.isRequired,
  //     thcContent: PropTypes.shape({
  //       min: PropTypes.number,
  //     }),
  //     cbdContent: PropTypes.shape({
  //       min: PropTypes.number,
  //     }),
  //     variations: PropTypes.arrayOf(
  //       PropTypes.shape({
  //         pricing: PropTypes.objectOf(
  //           PropTypes.shape({
  //             regular: PropTypes.number,
  //           }),
  //         ).isRequired,
  //         availability: PropTypes.objectOf(
  //           PropTypes.shape({
  //             quantity: PropTypes.number,
  //           }),
  //         ).isRequired,
  //       }),
  //     ).isRequired,
  //   }).isRequired,
  // ).isRequired,
  related: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      image: PropTypes.string.isRequired,
      category: PropTypes.string.isRequired,
      subCategory: PropTypes.string.isRequired,
      specifications: PropTypes.shape({
        thcPercentage: PropTypes.string,
        cbdPercentage: PropTypes.string,
      }).isRequired,
      pricing: PropTypes.object.isRequired,
      availability: PropTypes.object.isRequired,
    }).isRequired,
  ),
  match: PropTypes.object.isRequired,
  getProduct: PropTypes.func.isRequired,
  getRelated: PropTypes.func.isRequired,
  selectVariation: PropTypes.func.isRequired,
  clearProduct: PropTypes.func.isRequired,
  variation: PropTypes.number,
  history: PropTypes.object,
  getDevices: PropTypes.func,
  castingDetails: PropTypes.object,
  cancelCast: PropTypes.func,
  initiateCast: PropTypes.func,
  shrunk: PropTypes.bool,
  setShrunk: PropTypes.func,
  setOrientation: PropTypes.func,
}
const MainContainer = styled.View`
  flex: 1;
  position: relative;
`
const ScrollContainer = styled(ScrollView)`
  flex: 1;
  width: 100%;
  z-index: 1;
`
const ProductContainer = styled.View`
  width: 300px;
`
const BottomWrap = styled.View`
  padding-top: ${props => (props.portrait ? '20px' : '320px')};
  padding-right: ${props => (props.portrait ? '20px' : '420px')};
  flex: 1;
  padding-left: ${props => (props.portrait ? '20px' : '5px')};
`
const SpecificsWrap = styled.View`
  flex: 1;
  flex-direction: column;
  width: 100%;
  flex-wrap: wrap;
`
const TopWrap = styled.View`
  flex-direction: row;
  padding-bottom: ${props => (props.portrait ? '20px' : '0')};
  position: ${props => (props.portrait ? 'relative' : 'absolute')};
  right: 0;
  left: 0;
  padding-horizontal: ${props => (props.portrait ? NATIVE_GUTTER : '0')};
  top: 0;
  z-index: 1000;
  background-color: ${BRAND_SECONDARY};
`
const ProductWrapper = styled.View`
  flex: 1;
  padding-horizontal: ${props => (props.portrait ? '0px' : NATIVE_GUTTER)};
  position: relative;
`
/* eslint-disable */
const PaddingColumnLeft = styled.View`
  width: ${props => (props.portrait ? '300px' : '400px')};
  z-index: 1000;
  position: ${props => (props.portrait ?  'relative' : 'absolute')};
  right: ${props => (props.portrait ? 'auto' : '20px')};
`
const ProductName = styled.Text`
  color: ${BRAND_PRIMARY};
  font-size: ${props => (props.widescreen && !props.shrunk ? '40px' : '30px')};
  font-weight: bold;
  margin-top: -10px;
  padding-right:  ${props => (props.portrait ? '0px' : '420px')};
`
const PaddingColumnRight = styled.View`
  flex: 1;
  position: relative;
  padding: 20px;
  flex-wrap: wrap;
  padding-top: ${props => (props.shrunk ? (props.portrait ? '50px' : 0) : '50px')};
  padding-left: ${NATIVE_GUTTER}px;
`
const PriceWrap = styled.View`
  flex: 1;
  flex-direction: row;
  margin-top: ${props => (props.shrunk ? 0 : NATIVE_GUTTER_HALF)};
`
const Price = styled.Text`
  color: white;
  font-size: 35px;
  font-weight: bold;
`
const StruckPrice = styled.Text`
  text-decoration: line-through;
  font-size: 24px;
  font-weight: 100;
  color: white;
  margin-top: 10px;
  margin-left: 10px;
`
/* eslint-enable */
const Description = styled.Text`
  font-size: 16px;
  margin-bottom: ${NATIVE_GUTTER * 2}px;
`
const RelatedHeading = styled.Text`
  font-size: 25px;
  font-weight: bold;
  color: black;
  padding-bottom: ${NATIVE_GUTTER_HALF};
`
const VariationContainer = styled.View`
  margin-bottom: ${NATIVE_GUTTER_HALF};
`
const RelatedWrap = styled.View`
  padding-horizontal: ${props =>
    props.portrait ? NATIVE_GUTTER : NATIVE_GUTTER_HALF};
  padding-top: ${NATIVE_GUTTER}px;
  border-color: #f4f4f4;
  border-top-width: 1;
`
const PillsContainer = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  margin-vertical: ${NATIVE_GUTTER_HALF};
  padding-right: ${props => (props.portrait ? '0px' : '420px')};
`
const Pill = styled.TouchableOpacity`
  border-radius: 20px;
  background-color: rgba(256, 256, 256, 0.2);
  margin-right: 10px;
  align-items: center;
  justify-content: center;
  padding-horizontal: ${NATIVE_GUTTER}px;
  padding-vertical: 5px;
  margin-bottom: ${NATIVE_GUTTER_HALF}px;
  width: auto;
`
const PillText = styled.Text`
  font-size: 16px;
  color: white;
  padding-bottom: 2px;
`
const DescriptionTitle = styled.Text`
  color: ${BRAND_PRIMARY};
  font-weight: bold;
`
const DevicesContainer = styled.ScrollView`
  flex: 1;
  padding-horizontal: ${NATIVE_GUTTER_HALF}px;
  padding: ${NATIVE_GUTTER}px;
  margin-bottom: ${NATIVE_GUTTER}px;
`
const DeviceContainer = styled.View`
  flex: 1;
  /* border: 2px solid #f6f6f6; */
  margin-bottom: ${NATIVE_GUTTER}px;
`
const DeviceTitle = styled.Text`
  font-size: ${props => props.size || 16};
  color: ${props => props.color || 'black'};
  font-weight: bold;
`
const DeviceDrawerTitle = styled.Text`
  font-size: 24px;
  color: ${props => props.color || 'black'};
  font-weight: bold;
  margin-bottom: ${NATIVE_GUTTER};
`

const RelatedProductWrap = styled.View`
  flex-direction: row;
  flex: 1;
  padding-right: ${props => (props.portrait ? '20px' : '420px')};
  margin-horizontal: -5px;
  margin-bottom: ${NATIVE_GUTTER}px;
`
const ScreensContainer = styled.View`
  margin-bottom: 5px;
  flex-wrap: wrap;
  flex-direction: row;
  justify-content: space-between;
  flex: 1;
`
const Screen = styled.TouchableOpacity`
  width: ${props => props.width || '48%'};
  border: ${props =>
    props.casting ? `1px solid ${BRAND_PRIMARY}` : '1px solid #eee'};
  justify-content: center;
  align-items: center;
  margin-top: 10px;
  height: 60;
`
const ScreenTitle = styled.Text`
  font-size: 14;
  color: black;
  font-weight: bold;
`
const DropdownWrap = styled.View`
  width: 60%;
  height: 50px;
  border: 1px solid #f4f4f4;
  background-color: #f4f4f4;
  padding-horizontal: ${NATIVE_GUTTER}px;
  margin-bottom: ${NATIVE_GUTTER}px;
`
const mapStateToProps = () => (state, props) => ({
  selectedImage: makeSelectImage()(state),
  variation: makeSelectVariation()(state),
  product: makeSelectProduct()(state),
  related: makeSelectRelated()(state),
  currentStore: makeSelectCurrentStore()(state),
  addedToCart: makeSelectAddedToCart()(state),
  quantityInCart: makeSelectQuantityInCart()(state, props),
  cartSize: makeSelectCartCount()(state),
  castingDetails: makeSelectCastingDetails()(state),
  shrunk: makeSelectShrunk()(state),
  promotions: makeSelectPromotions()(state),
  // stores: makeSelectStores()(state),
  // closestStores: makeSelectClosestStores()(state),
})

function mapDispatchToProps(dispatch) {
  return {
    getProduct: productId => dispatch(getProductRequest(productId)),
    getRelated: productId => dispatch(getRelatedRequest(productId)),
    selectVariation: variation => dispatch(selectVariationAction(variation)),
    // getCategories: () => dispatch(getCategoriesRequest()),
    clearProduct: () => dispatch(clearProductAction()),
    selectImage: image => dispatch(selectImageAction(image)),
    decrement: () => dispatch(decrementAction()),
    increment: () => dispatch(incrementAction()),
    // setQuantity: quantity => dispatch(setQuantityAction(quantity)),
    selectStore: store => dispatch(selectStoreAction(store)),
    setShrunk: shrunk => dispatch(setShrunkHeader(shrunk)),
    addToCart: (product, quantity, store) =>
      dispatch(addToCartAction(product, quantity, store)),
    // clearCart: () => dispatch(clearCartAction()),
    getDevices: store => dispatch(getDevicesRequest(store)),
    initiateCast: (device, screen, product) =>
      dispatch(startCastingRequest(device, screen, product)),
    cancelCast: (device, screen) =>
      dispatch(stopCastingRequest(device, screen)),
    setOrientation: o => dispatch(setDeviceOrientationAction(o)),
  }
}

const withConnect = connect(
  mapStateToProps,
  mapDispatchToProps,
)
const withReducer = injectReducer({ key: 'productPage', reducer })
const withSaga = injectSaga({ key: 'productPage', saga })

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(ProductPage)
