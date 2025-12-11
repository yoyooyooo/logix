export interface SpecFeature {
  id: string
  title: string
  description: string
  stories: readonly SpecStory[]
}

export interface SpecStory {
  id: string
  featureId: string
  title: string
  userStory: string // As a... I want... So that...
  scenarios: readonly SpecScenario[]
}

export interface SpecScenario {
  id: string
  storyId: string
  title: string
  description?: string
  steps: readonly SpecStep[]
}

export interface SpecStep {
  id: string
  label: string
  intentScript?: string
  expectations?: {
    uiIntents?: any[]
    stateSnapshot?: any
  }
}

// Mock Data Structure
export const MOCK_SPEC_DATA: SpecFeature[] = [
  {
    id: 'feat-region',
    title: 'Region Selector',
    description: 'Core provincial/city/district selection logic',
    stories: [
      {
        id: 'story-new-address',
        featureId: 'feat-region',
        title: 'New Address Creation',
        userStory: 'As a user, I want to select my region so that I can complete my shipping address.',
        scenarios: [
          {
            id: 'sc-happy-path',
            storyId: 'story-new-address',
            title: 'Happy Path: Select Province -> City -> District',
            steps: [
              { id: '1', label: 'Open Page', intentScript: '/button open 打开页面' },
              {
                id: '2',
                label: 'Select Province: Guangdong',
                intentScript: '/select province 选择省份 [{"code":"44","name":"广东"}]',
              },
              {
                id: '3',
                label: 'Select City: Shenzhen',
                intentScript: '/select city 选择城市 [{"code":"4403","name":"深圳"}]',
              },
              {
                id: '4',
                label: 'Select District: Nanshan',
                intentScript: '/select district 选择区县 [{"code":"440305","name":"南山"}]',
              },
            ],
            description: 'Standard flow for selecting a complete address.',
          },
          {
            id: 'sc-change-province',
            storyId: 'story-new-address',
            title: 'Edge Case: Change Province Resets City',
            steps: [
              {
                id: '1',
                label: 'Select Province A',
                intentScript: '/select province 选择省份 [{"code":"11","name":"北京"}]',
              },
              {
                id: '2',
                label: 'Select City A',
                intentScript: '/select city 选择城市 [{"code":"1101","name":"市辖区"}]',
              },
              {
                id: '3',
                label: 'Change Province B',
                intentScript: '/select province 选择省份 [{"code":"44","name":"广东"}]',
              },
              { id: '4', label: 'Verify City Reset', intentScript: '' },
            ],
            description: 'Verifying that changing the province clears the city selection.',
          },
        ],
      },
      {
        id: 'story-edit-address',
        featureId: 'feat-region',
        title: 'Edit Existing Address',
        userStory: 'As a user, I want to see my previously selected region pre-filled so that I can modify it.',
        scenarios: [
          {
            id: 'sc-prefetch',
            storyId: 'story-edit-address',
            title: 'Prefill: Guangdong/Shenzhen/Nanshan',
            steps: [
              { id: '1', label: 'Load Page with Data', intentScript: '/load region-api-data' },
              { id: '2', label: 'Verify Values', intentScript: '/assert province "广东"' },
            ],
            description: 'Ensure form initializes correctly with existing data.',
          },
        ],
      },
    ],
  },
  {
    id: 'feat-product',
    title: 'Product Detail',
    description: 'Product display, options selection, and cart actions',
    stories: [
      {
        id: 'story-add-to-cart',
        featureId: 'feat-product',
        title: 'Add to Cart',
        userStory: 'As a user, I want to select product options and add to cart.',
        scenarios: [
          {
            id: 'sc-p-1',
            storyId: 'story-add-to-cart',
            title: 'Select Size & Color',
            description: 'User picks valid combination',
            steps: [
              { id: '1', label: 'Open Product Page', intentScript: '/open product-123' },
              { id: '2', label: 'Select Color: Red', intentScript: '/select color "Red"' },
              { id: '3', label: 'Select Size: M', intentScript: '/select size "M"' },
              { id: '4', label: 'Click Add to Cart', intentScript: '/click add-to-cart' },
              { id: '5', label: 'Verify Toast', intentScript: '/assert toast "Added"' },
            ],
          },
        ],
      },
    ],
  },
]
