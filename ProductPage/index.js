/**
 *
 * ProductPage
 *
 */

import _ from 'lodash'
import React from 'react'
import PropTypes from 'prop-types'
import ReactGA from 'react-ga'
import { FormattedMessage } from 'react-intl'
import { connect } from 'react-redux'
import { Helmet } from 'react-helmet'
import { compose } from 'redux'
import { Grid, Row, Col, ProgressBar } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { rgba } from 'polished'
import styled, { css } from 'styled-components'
import qs from 'qs'
import {
  ProductCard,
  Label,
  H2,
  JumboLinkExternal,
  Breadcrumb,
  Spinner,
} from '@hifyreinc/faf-components'
import {
  BRAND_PRIMARY,
  BRAND_SECONDARY,
  COVER_BACKGROUND,
  GRAY_LIGHT,
  SCREEN_XS_MAX,
  SCREEN_SM_MAX,
  SCREEN_MD_MIN,
  WHOLESALE_ACCENT_LIGHT,
  WHOLESALE_PRIMARY,
  WHOLESALE_SECONDARY,
} from '@hifyreinc/faf-styles'
import config from 'config'
import injectSaga from 'utils/injectSaga'
import injectReducer from 'utils/injectReducer'
import getCovaImage from 'utils/getCovaImage'
import formatPrice from 'compliance/formatPrice'
import OrderForm from 'containers/OrderForm'
import NavbarSpacer from 'components/NavbarSpacer'
import ProductGrid from 'components/ProductGrid'
import Section from 'components/Section'
import VariationSelector from 'components/VariationSelector'
import {
  makeSelectSignedIn,
  makeSelectCurrentStore,
} from 'containers/App/selectors'
import { makeSelectProvince } from 'containers/SessionModal/selectors'
import {
  getProductRequest,
  getRelatedRequest,
  selectVariationAction,
  selectImageAction,
  clearProductAction,
} from './actions'
import {
  makeSelectProduct,
  makeSelectGetProductRequest,
  makeSelectRelated,
  makeSelectImage,
  makeSelectVariation,
  makeSelectAddedToCart,
} from './selectors'
import reducer from './reducer'
import saga from './saga'
import messages from './messages'
import ProductNotification from './ProductNotification'
import FAFbg from './faf-bg.svg'
import WSbg from './wholesale-bg.svg'
import { GRID_GUTTER, FONT_WEIGHT_BOLD } from '../../global-styles'

/* eslint-disable react/prefer-stateless-function */
export class ProductPage extends React.PureComponent {
  constructor(props) {
    super(props)
    this.handleVariationChange = this.handleVariationChange.bind(this)
    this.handleVariationChangeByName = this.handleVariationChangeByName.bind(
      this,
    )
    this.renderVariationSelectors = this.renderVariationSelectors.bind(this)
    this.renderTerpenes = this.renderTerpenes.bind(this)
  }
  componentDidMount() {
    ReactGA.pageview(this.props.location.pathname + this.props.location.search)
  }
  componentWillMount() {
    const {
      wholesale,
      signedIn,
      history,
      match,
      getProduct,
      getRelated,
    } = this.props

    if (wholesale && !signedIn) {
      history.push('/')
      return
    }

    const productId = _.last(match.params.id.split('-'))
    getProduct(productId)
    getRelated(productId)
  }

  componentWillReceiveProps(nextProps) {
    const prevProps = this.props
    const { match, getProduct, getRelated } = nextProps
    const productId = match.params.id
    if (prevProps.match.params.id !== productId) {
      getProduct(productId)
      getRelated(productId)
    }
  }

  componentWillUnmount() {
    this.props.clearProduct()
  }

  makeVariationObject(variation) {
    const netContent = _.get(variation, ['netContent', 'value'])
    const netContentUnit = _.get(variation, ['netContent', 'unit'])
    const itemsPerPack = _.get(variation, 'itemsPerPack')
    return {
      size: _.get(variation, 'size'),
      colour: _.get(variation, 'colour'),
      itemsPerPack: itemsPerPack && itemsPerPack.toString(),
      variationType: _.get(variation, 'variationType'),
      weight:
        netContentUnit && netContentUnit.endsWith('g')
          ? netContent.toString()
          : undefined,
      volume: netContentUnit === 'mL' ? netContent.toString() : undefined,
    }
  }

  handleVariationChange(type, selected) {
    const { product, variation, selectVariation } = this.props
    const variationSpecs = this.makeVariationObject(
      _.get(product, ['variations', variation]),
    )
    const nextSpecs = _.set(variationSpecs, type, selected)
    const nextVariation = _.findIndex(product.variations, v =>
      _.isEqual(this.makeVariationObject(v), nextSpecs),
    )
    if (nextVariation >= 0) selectVariation(nextVariation)
  }

  handleVariationChangeByName(type, selected) {
    const { product, selectVariation } = this.props
    const nextVariation = _.findIndex(
      product.variations,
      v => v.name === selected,
    )
    if (nextVariation >= 0) selectVariation(nextVariation)
  }

  renderVariationSelectors() {
    const { product, variation, wholesale } = this.props
    if (product.variations.length < 1) return ''

    const v = _.get(product, ['variations', variation])
    if (product.category === 'Accessories') {
      const variations = _.chain(product)
        .get('variations')
        .map(a => a.name)
        .value()
      return (
        <VariationWrapper>
          <Label>
            {'Please Choose:'}
            <VariationSelector
              align="left"
              variations={variations}
              selected={_.get(v, 'name')}
              type="name"
              onChange={this.handleVariationChangeByName}
              wholesale={wholesale}
            />
          </Label>
        </VariationWrapper>
      )
    }

    return _.chain(product)
      .get('variationTypes')
      .toPairs()
      .sortBy(([type]) => type)
      .map(([type, variations]) => {
        const label = _.snakeCase(type)
          .split('_')
          .join(' ')
        const param =
          type === 'weight' || type === 'volume'
            ? ['netContent', 'value']
            : type
        const unit =
          type === 'weight' || type === 'volume'
            ? _.get(v, ['netContent', 'unit'])
            : undefined
        return (
          <VariationWrapper key={type} block={type === 'colour'}>
            <Label>
              {label}
              <VariationSelector
                align="center"
                variations={variations}
                unit={unit}
                type={type}
                selected={_.get(v, param)}
                onChange={this.handleVariationChange}
                wholesale={wholesale}
              />
            </Label>
          </VariationWrapper>
        )
      })
      .value()
  }

  renderConcentration(name, concentration) {
    if (_.isEmpty(concentration)) return ''
    const { min, max, unit } = concentration
    let range
    if (!max || min === max) range = `${min}${unit}`
    else if (!min) range = `<${max}${unit}`
    else range = `${min} - ${max}${unit}`
    return (
      <FlexCol>
        <Label>{name}</Label>
        <p>{range}</p>
      </FlexCol>
    )
  }

  renderField(name, field) {
    if (!field) return ''
    return (
      <FlexCol>
        <Label>{name}</Label>
        <p>{field}</p>
      </FlexCol>
    )
  }

  renderTerpenes() {
    const { product, variation } = this.props
    const terpenes = _.chain(product)
      .get(['variations', variation, 'terpenes'])
      .filter(t => t.content)
      .value()
    if (!terpenes || terpenes.length === 0) return ''
    return (
      <FlexCol half>
        <Label>Terpenes</Label>
        <Table>
          <TableBody>
            {_.map(terpenes, t => (
              <TableRow>
                <TableCell>{t.type}</TableCell>
                <TableCell full>
                  <ProgressBar now={t.content} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </FlexCol>
    )
  }

  renderProductSection() {
    const {
      match,
      addedToCart,
      product,
      variation,
      storeId,
      selectedImage,
      selectImage,
      getProductStatus,
      wholesale,
      province,
    } = this.props

    // TODO: Lauren style these to improve look of page while loading
    if (getProductStatus.pending || !product) {
      return (
        <Section>
          <NavbarSpacer wholesale={wholesale} />
          <Spinner wholesale={wholesale} />
        </Section>
      )
    } else if (getProductStatus.error) {
      return (
        <Section>
          <NavbarSpacer wholesale={wholesale} />
          <FormattedMessage {...messages[getProductStatus.error]} />
        </Section>
      )
    }

    const crumbs = [
      {
        name: 'All Products',
        link: '/shop',
      },
      {
        name: product.category,
        link: `/shop?category=${product.category}`,
      },
      {
        name: product.subCategory,
        link:
          `/shop?category=${product.category}&` +
          `subCategory=${product.subCategory}`,
      },
    ]
    const variationImages = _.get(product, ['variations', variation, 'images'])
    const images = variationImages || []
    if (images.length === 0 && product.image) images.push(product.image)
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
            : qs.stringify({ category: product.category, [key]: group })
        return (
          <Link to={`/shop?${q}`}>
            <li>{group}</li>
          </Link>
        )
      })
      .value()
    return (
      <div>
        <HeaderSection wholesale={wholesale}>
          <NavbarSpacer wholesale={wholesale} />
          <Grid>
            <BreadcrumbWrapper wholesale={wholesale}>
              <Breadcrumb light crumbs={crumbs} />
            </BreadcrumbWrapper>
            <Row>
              <Col md={5}>
                {/* Main Product Image */}

                <ImageWrapper wholesale={wholesale}>
                  <Image imageUrl={getCovaImage(images[selectedImage], 1040)}>
                    {addedToCart && (
                      <ProductNotification>Added to Cart!</ProductNotification>
                    )}
                  </Image>
                  {/* Additional Product Images */}
                  {images > 1 && (
                    <AdditionalPhotos>
                      {images.map((image, index) => (
                        <button key={image} onClick={() => selectImage(index)}>
                          <img
                            className={
                              selectedImage === index ? 'selected' : ''
                            }
                            src={getCovaImage(image, 200)}
                            alt={product.name}
                          />
                        </button>
                      ))}
                    </AdditionalPhotos>
                  )}
                </ImageWrapper>
              </Col>

              <Col md={7}>
                <HeaderText wholesale={wholesale}>
                  <div>
                    <Title wholesale={wholesale}>{product.name}</Title>
                    <GroupList>{groups}</GroupList>
                  </div>

                  <Price>
                    {formatPrice(
                      _.get(product, [
                        'variations',
                        variation,
                        'pricing',
                        storeId,
                        'regular',
                      ]),
                      { province, category: product.category },
                    )}
                  </Price>
                </HeaderText>
              </Col>
            </Row>
          </Grid>
        </HeaderSection>
        <BodySection>
          <Grid>
            <Row style={{ clear: 'both' }}>
              <Col md={5}>
                <Description>
                  {(product.fullDescription || product.description) && (
                    <Label>Description</Label>
                  )}
                  <p>{product.fullDescription || product.description || ``}</p>
                </Description>
              </Col>

              <Col md={7}>
                <BodyText>
                  <FlexWrapper>
                    {this.renderConcentration(
                      'THC',
                      _.get(product, ['variations', variation, 'thcContent']),
                    )}
                    {this.renderConcentration(
                      'CBD',
                      _.get(product, ['variations', variation, 'cbdContent']),
                    )}
                    {this.renderField('Strain Name', product.strain)}
                    {this.renderField('Brand Name', product.brand)}
                    {this.renderField('Supplier', product.licensedProducer)}
                    {this.renderTerpenes()}
                  </FlexWrapper>

                  {this.renderVariationSelectors()}

                  <OrderForm
                    productId={match.params.id}
                    wholesale={wholesale}
                  />
                </BodyText>
              </Col>
            </Row>
          </Grid>
        </BodySection>
      </div>
    )
  }

  renderRelatedSection() {
    const { province, related, storeId, wholesale } = this.props
    if (!related || related.length < 1) return ''
    return (
      <Section>
        <Grid>
          <FeatureTitle>You may also enjoy</FeatureTitle>

          <StyledProductGrid third>
            {_.map(related, recommendation => {
              const prices = _.chain(recommendation)
                .get('variations')
                .map(v => _.get(v, ['pricing', storeId, 'regular']))
                .sortBy(_.identity)
                .value()
              const formattedPrice = formatPrice(_.head(prices), {
                province,
                category: recommendation.category,
              })
              const price =
                prices.length > 1 ? `From ${formattedPrice}` : formattedPrice
              const totalStock = _.chain(recommendation)
                .get('variations')
                .map(v => _.get(v, ['availability', storeId, 'quantity']) || 0)
                .reduce((sum, n) => sum + n, 0)
                .value()
              return (
                <ProductCard
                  wholesale={wholesale}
                  key={recommendation.id}
                  id={recommendation.id}
                  title={recommendation.name}
                  imageUrl={getCovaImage(recommendation.image, 650)}
                  subtitle={_.get(recommendation, 'subCategory')}
                  heading=""
                  price={formattedPrice ? price : ''}
                  soldOut={totalStock <= 0}
                />
              )
            })}
          </StyledProductGrid>
        </Grid>
      </Section>
    )
  }

  renderJumboLinks() {
    const { wholesale } = this.props
    return wholesale ? (
      ''
    ) : (
      <Section>
        <Grid>
          <Row>
            <Col sm={6}>
              <JumboLinkExternal
                title="Find your local cannabis shop"
                linkText="See locations"
                link="https://marketing.staging.fireandflower.com/stores/"
                secondary
                external
              />
            </Col>
            <Col sm={6}>
              <JumboLinkExternal
                title="Have burning questions?"
                linkText="FAQ's"
                link="https://marketing.staging.fireandflower.com/faq/"
              />
            </Col>
          </Row>
        </Grid>
      </Section>
    )
  }

  render() {
    const { product } = this.props
    return (
      <div>
        <Helmet>
          <title>{_.get(product, 'name')}</title>
          {/* TODO description
          <meta name="description" content="Description of ProductPage" /> */}
        </Helmet>
        <div>
          {this.renderProductSection()}
          {this.renderRelatedSection()}
          {this.renderJumboLinks()}
        </div>
      </div>
    )
  }
}

ProductPage.propTypes = {
  signedIn: PropTypes.bool,
  wholesale: PropTypes.bool,
  selectedImage: PropTypes.number.isRequired,
  variation: PropTypes.number.isRequired,
  addedToCart: PropTypes.bool.isRequired,
  storeId: PropTypes.string.isRequired,
  province: PropTypes.string.isRequired,
  product: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    subCategory: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    productType: PropTypes.string,
    strain: PropTypes.string,
    strainType: PropTypes.string,
    subStrainType: PropTypes.string,
    brand: PropTypes.string,
    licensedProducer: PropTypes.string,
    variationTypes: PropTypes.shape({
      size: PropTypes.arrayOf(PropTypes.string),
      colour: PropTypes.arrayOf(PropTypes.string),
      weight: PropTypes.arrayOf(PropTypes.number),
      volume: PropTypes.arrayOf(PropTypes.number),
    }),
    variations: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        primaryImage: PropTypes.string,
        images: PropTypes.arrayOf(PropTypes.string).isRequired,
        equivalentValue: PropTypes.number,
        netContent: PropTypes.shape({
          value: PropTypes.number,
          unit: PropTypes.string,
        }),
        itemsPerPack: PropTypes.number,
        size: PropTypes.string,
        colour: PropTypes.string,
        thcContent: PropTypes.shape({
          min: PropTypes.number,
          max: PropTypes.number,
        }),
        cbdContent: PropTypes.shape({
          min: PropTypes.number,
          max: PropTypes.number,
        }),
        terpenes: PropTypes.arrayOf(
          PropTypes.shape({
            type: PropTypes.string.isRequired,
            content: PropTypes.number,
          }),
        ),
        package: {
          height: PropTypes.number,
          length: PropTypes.number,
          width: PropTypes.number,
          weight: PropTypes.number,
        },
        pricing: PropTypes.objectOf(
          PropTypes.shape({
            regular: PropTypes.number,
          }),
        ).isRequired,
        availability: PropTypes.objectOf(
          PropTypes.shape({
            quantity: PropTypes.number,
          }),
        ).isRequired,
      }),
    ),
  }),
  related: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      image: PropTypes.string.isRequired,
      category: PropTypes.string.isRequired,
      subCategory: PropTypes.string.isRequired,
      thcContent: PropTypes.shape({
        min: PropTypes.number,
      }),
      cbdContent: PropTypes.shape({
        min: PropTypes.number,
      }),
      variations: PropTypes.arrayOf(
        PropTypes.shape({
          pricing: PropTypes.objectOf(
            PropTypes.shape({
              regular: PropTypes.number,
            }),
          ).isRequired,
          availability: PropTypes.objectOf(
            PropTypes.shape({
              quantity: PropTypes.number,
            }),
          ).isRequired,
        }),
      ).isRequired,
    }).isRequired,
  ),
  match: PropTypes.object.isRequired,
  getProduct: PropTypes.func.isRequired,
  getProductStatus: PropTypes.shape({
    error: PropTypes.number,
    pending: PropTypes.bool.isRequired,
  }).isRequired,
  getRelated: PropTypes.func.isRequired,
  selectVariation: PropTypes.func.isRequired,
  selectImage: PropTypes.func.isRequired,
  clearProduct: PropTypes.func.isRequired,
  history: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
}

const mapStateToProps = () => state => ({
  province: makeSelectProvince()(state),
  selectedImage: makeSelectImage()(state),
  variation: makeSelectVariation()(state),
  addedToCart: makeSelectAddedToCart()(state),
  storeId: makeSelectCurrentStore()(state) || config.ONLINE_LOCATION_ID,
  product: makeSelectProduct()(state),
  related: makeSelectRelated()(state),
  getProductStatus: makeSelectGetProductRequest()(state),
  signedIn: makeSelectSignedIn()(state),
})

function mapDispatchToProps(dispatch) {
  return {
    getProduct: productId => dispatch(getProductRequest(productId)),
    getRelated: productId => dispatch(getRelatedRequest(productId)),
    selectVariation: variation => dispatch(selectVariationAction(variation)),
    selectImage: image => dispatch(selectImageAction(image)),
    clearProduct: () => dispatch(clearProductAction()),
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

const Wrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
`

const AdditionalPhotos = styled(Wrapper)`
  position: relative;
  img {
    height: 60px;
    width: 60px;
    margin: ${GRID_GUTTER};
    border: solid 1px ${GRAY_LIGHT};
    &:hover {
      opacity: 1;
    }
    &.selected {
      border-width: 4px;
    }
    ${SCREEN_XS_MAX} {
      height: 45px;
      width: 45px;
    }
  }
  button {
    padding: 0;
  }
`

const FeatureTitle = styled(H2)`
  margin-bottom: 0.6em;
  font-size: 2.3em;
  line-height: 1.2;
`

const Title = styled.h1`
  font-size: 1.8em;
  margin-bottom: 8px;
  color: ${props =>
    props.wholesale ? WHOLESALE_PRIMARY : BRAND_PRIMARY} !important;
  ${SCREEN_XS_MAX} {
    font-size: 22px;
  }
`

const Price = styled.span`
  display: inline-block;
  font-size: 1.8em;
  font-weight: ${FONT_WEIGHT_BOLD};
  margin-top: 1.3em;
  color: white;
  ${SCREEN_SM_MAX} {
    font-size: 18px;
    margin-top: 0.5em;
    margin-bottom: 1em;
  }
`

const FlexWrapper = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  margin: 0 -${GRID_GUTTER};
`

const FlexCol = styled.div`
  padding: 0 ${GRID_GUTTER};
  white-space: nowrap;
  ${props =>
    props.half &&
    css`
      flex-basis: 50%;
      flex-grow: 0;
      ${SCREEN_XS_MAX} {
        flex-basis: 100%;
      }
    `};
  p {
    white-space: nowrap;
    font-size: 0.8em;
  }
`

const BreadcrumbWrapper = styled.div`
  margin: ${props => (props.wholesale ? '6.5em 0 1em' : '3em 0 1em')};
`

const HeaderSection = styled.section`
  background-color: ${props =>
    props.wholesale ? WHOLESALE_SECONDARY : BRAND_SECONDARY};
  position: relative;
  clear: both;
  ${SCREEN_MD_MIN} {
    overflow: auto;
    .row {
      height: 250px;
      overflow: visible;
    }
  }
`

const BodySection = styled(HeaderSection)`
  background-color: white;
  overflow: visible;
  .container {
    ${SCREEN_MD_MIN} {
      margin-top: -200px;
    }
  }
  .row {
    height: auto;
  }
`

const HeaderText = styled.div`
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  ${SCREEN_MD_MIN} {
    padding-left: 1em;
  }
`

const BodyText = styled.div`
  padding: 1em 0;
  ${SCREEN_MD_MIN} {
    padding-left: 1em;
  }
`

const VariationWrapper = styled.div`
  display: flex;
  z-index: 555;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  flex: 1;
  margin-top: 1em;
  select,
  input {
    margin-top: 8px;
    min-width: 213px;
    max-width: 100%;
    width: auto;
  }
  ${props =>
    props.block &&
    css`
      flex-basis: 100%;
      margin-bottom: 20px;
    `};
  ${SCREEN_SM_MAX} {
    margin-bottom: 20px;
  }
`

const ImageWrapper = styled.div`
  width: 100%;
  background-color: #eee;
  background-image: url("${FAFbg}");
  background-size: 45px;
  background-position: center center;
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  z-index: 999;
  &:before {
    content: '';
    display: block;
    padding-top: 100%;
  }
  ${props =>
    props.wholesale &&
    css`
      border: solid 1px ${WHOLESALE_ACCENT_LIGHT};
      background-image: url("${WSbg}");
      background-color: ${WHOLESALE_ACCENT_LIGHT};
    `};
`

const Image = styled.div`
  position: absolute;
  top: 0; left: 0; bottom: 0; right: 0;
  ${COVER_BACKGROUND};
  background-image: url("${props => props.imageUrl}");
  width: 100%;
  display: flex;
  align-items: stretch;
  justify-content: center;
`

const GroupList = styled.ul`
  display: flex;
  list-style: none;
  padding: 0;
  -webkit-padding-start: 0;
  flex-wrap: wrap;
  li {
    white-space: nowrap;
    font-size: 0.75em;
    padding: 5px 15px 4px;
    border-radius: 20px;
    color: white;
    background-color: ${rgba('white', 0.15)};
    margin: 0 5px 5px 0;
    cursor: pointer;
    &:hover,
    &:focus {
      background-color: ${rgba('white', 0.3)};
    }
  }
`

const Description = styled.div`
  padding-top: 30px;
  ${SCREEN_MD_MIN} {
    margin-top: 200px;
  }
  p {
    ${SCREEN_MD_MIN} {
      padding-right: 2em;
    }
  }
`

const Table = styled.div`
  display: table;
  width: 100%;
  font-size: 0.8em;
`

const TableBody = styled.div`
  display: table-row-group;
`

const TableRow = styled.div`
  display: table-row;
`

const TableCell = styled.div`
  display: table-cell;
  white-space: nowrap;
  vertical-align: middle;
  width: ${props => (props.full ? '100%' : '1%')};
`

// Limits the Product Grid to only display 3, 2 at SM
const StyledProductGrid = styled(ProductGrid)`
  a:nth-child(n + 4) {
    display: none;
  }
  ${SCREEN_SM_MAX} {
    a:nth-child(n + 3) {
      display: none;
    }
  }
`
