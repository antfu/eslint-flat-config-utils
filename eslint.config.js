// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    rules: {
      'ts/explicit-function-return-type': 'error',
    },
  },
)
