export const environment = {
  production: false,
  // Empty in development → requests go through Angular proxy (avoids CORS)
  // Proxy target: https://alhendalcompany-001-site9.atempurl.com
  apiBaseUrl: '',
  apiEndpoints: {
    auth: {
      login: '/api/Auth/login',
      register: '/api/Auth/register',
      logout: '/api/Auth/logout'
    },
    categories: {
      getAll: '/api/Categories/GetAllCategories',
      getById: '/api/Categories/GetCategoryById',
      add: '/api/Categories/AddCategory',
      update: '/api/Categories/UpdateCategory',
      delete: '/api/Categories/DeleteCategory'
    },
    products: {
      getAll: '/api/Products/GetAllProducts',
      getById: '/api/Products/GetProductById',
      add: '/api/Products/AddProduct',
      update: '/api/Products/UpdateProduct',
      delete: '/api/Products/DeleteProduct'
    },
    teawareCategories: {
      getAll: '/api/TeawareCategories/GetAllTeawareCategories',
      getById: '/api/TeawareCategories/GetTeawareCategoryById',
      add: '/api/TeawareCategories/AddTeawareCategory',
      update: '/api/TeawareCategories/UpdateTeawareCategory',
      delete: '/api/TeawareCategories/DeleteTeawareCategory'
    },
    teawares: {
      getAll: '/api/Teawares/GetAllTeawares',
      getById: '/api/Teawares/GetTeawareById',
      add: '/api/Teawares/AddTeaware',
      update: '/api/Teawares/UpdateTeaware',
      delete: '/api/Teawares/DeleteTeaware'
    },
    profile: '/api/Profile',
    search: '/api/Search',
    cart: '/api/Cart',
    wishlist: '/api/Wishlist/GetWishlist'
  }
};
