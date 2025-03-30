module.exports = {
  extends: ['react-app', 'react-app/jest'],
  plugins: ['unused-imports', 'import'],
  rules: {
    // turn off default no-unused-vars since we're using unused-imports
    'no-unused-vars': 'off',
    
    // turn on unused-imports rules
    'unused-imports/no-unused-imports': 'warn',
    'unused-imports/no-unused-vars': [
      'warn',
      { 
        vars: 'all', 
        varsIgnorePattern: '^_', 
        args: 'after-used', 
        argsIgnorePattern: '^_' 
      }
    ],
    
    // other useful rules
    'no-unused-expressions': 'warn',
    'no-unused-labels': 'warn',
    'import/no-unused-modules': ['warn', { unusedExports: true }],
    'no-unreachable': 'warn'
  },
  ignorePatterns: ['build/**', 'node_modules/**']
}; 