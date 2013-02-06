'use strict';



(function() {  

var module = angular.module('zdrojak.controller', []);

/**
 * App Controller
 * 
 */

module.controller('AppCtrl', ['$scope', 'basket', function($scope, basket){
  $scope.basket = basket;        
}]);


/**
 * Vyhledavani
 * 
 */

module.controller('MenuSearchCtrl', ['$scope', '$location', function($scope, $location) {
  $scope.search = function() {
    $location.url('/vyhledavani/' + $scope.query);    
  }
}]);


/**
 * Menu stranek.
 * 
 */

module.controller('MenuPagesCtrl', ['$scope', 'api', function($scope, api) {
  $scope.pages = api.page.index({fields: ['name', 'url']});
}]);


/**
 * Menu kategorii.
 * 
 */

module.controller('MenuCategoriesCtrl', ['$scope', 'api', function($scope, api) {
  $scope.categories = api.category.index();    
}]);


/**
 * Seznam produktu na uvodni strance.
 * 
 */

module.controller('IndexCtrl', ['$scope', 'api', function($scope, api) {
  $scope.products = api.product.homepage({homepage: true});  
}]);


/**
 * Vyhledavani
 * 
 */

module.controller('SearchCtrl', ['$scope', '$routeParams', '$location', 'parametricSearch', 'api', function ($scope, $routeParams, $location, parametricSearch, api) {
  var query = {};
  var ps = parametricSearch({limit: 10});
  
  $scope.query = $routeParams.query;
  $scope.limit = ps.getLimit();
  $scope.page  = ps.getPage();
  
  $scope.filter = function(offset) {
    $scope.load(offset);
    $location.search({offset: query.offset, limit: query.limit});    
  }; 
  
  $scope.load = function(offset) {
    query.offset = offset || 0;  
    query.limit  = $scope.limit;
    query.query  = $scope.query;
    $scope.results = api.product.index(query); 
  };
  
  $scope.load(ps.getOffset()); 
}]);


/**
 * Detail stranky
 * 
 */

module.controller('PageCtrl', ['$scope', '$routeParams', 'api', function ($scope, $routeParams, api) {
  $scope.page = api.page.show({url: $routeParams.page});
}]);


/**
 * Kategorie.
 * 
 */

module.controller('CategoryCtrl', ['$scope', '$routeParams', '$location', 'parametricSearch', 'api', function ($scope, $routeParams, $location, parametricSearch, api) { 
  var query = {};
  var ps = parametricSearch({limit: 10, sortColumns: ['price', '-price']});
  
  $scope.category = api.category.show({url: $routeParams.category}, function(){
    $scope.category.params.forEach(function(param){
      var filterParam = ps.getFilterParam(param.code);
      if (!Array.isArray(filterParam)) return;
      param.values.forEach(function(value){
        if(~filterParam.indexOf(value.code)) value.checked = true;   
      });
    });
    $scope.price = ps.getFilterParamAsString('price', $scope.category.maxPrice);
    $scope.sort  = ps.getSort();
    $scope.limit = ps.getLimit();
    $scope.page  = ps.getPage();
    $scope.load(ps.getOffset(), false); 
  });  
  
  //nahraje produkty dle nastaveni formulare a zmeni URL podle nastaveni formulare.
  $scope.filter = function(offset, reset) {
    reset = angular.isDefined(reset) ? reset : true;
    $scope.load(offset, reset);
    $location.search({
      filter: query.filter, sort: query.sort, 
      offset: query.offset, limit: query.limit
    });    
  }; 
  
  //nahraje produkty podle nastaveni formulare.
  $scope.load = function(offset, reset) {
    query.filter = $scope.serialize();      
    query.category = $routeParams.category;
    query.sort   = $scope.sort;
    query.offset = offset || 0;  
    query.limit  = $scope.limit;
    $scope.results = api.product.index(query, function(){
      if (reset) $scope.page = 1;
    }); 
  };
  
  //serializuje formular (rojde vsechny hodnoty ve formulare a prevede je na retezec).
  $scope.serialize = function() {
    var values = [];
    $scope.category.params.forEach(function(param){
      var vals = [];
      param.values.forEach(function(value){
        if (value.checked) vals.push(value.code);
      });   
      if (vals.length > 0){
        values.push(param.code + ':' + vals.join(','));      
      }
    });
    values.push('price:' + $scope.price);
    return values.join('@'); 
  };
}]);


/**
 * Detail produktu.
 * 
 */

module.controller('ProductCtrl', ['$scope', '$routeParams', '$location', 'api', 'basket', function Product($scope, $routeParams, $location, api, basket) {
  $scope.addToBasket = function(variant){
    if (!basket.exist($scope.product.id, variant.name)) {
      basket.add({
        id: $scope.product.id, 
        name: $scope.product.name, 
        url: $scope.product.url, 
        variant: variant.name, 
        price: $scope.product.price,
        quantity: 1
      });  
    }
    $location.path('/kosik');      
  }
  $scope.product = api.product.show({url: $routeParams.product});   
}]);


/**
 * Kosik.
 * 
 */

module.controller('BasketCtrl', ['$scope', '$location', 'basket', function ($scope, $location, basket) {
  $scope.step = 'basket';  
  $scope.products = basket.getAll();
  $scope.next = function() {
    $location.path('/zakaznicke-udaje');      
  };
}]);


/**
 * Udaje o zakaznikovi.
 * 
 * radio input v ng-repeat: https://github.com/angular/angular.js/issues/1100
 */

module.controller('CustomerCtrl', ['$scope', '$location', 'basket', 'transport', function ($scope, $location, basket, transport) {
  $scope.step = 'customer';
  if (!basket.hasProducts()) {
    $location.path('/kosik');    
    return;
  }
  
  $scope.customer  = basket.getCustomer();
  $scope.transport = basket.getTransport() || {code: 'personal'};
  $scope.transportMethods = transport.methods();
  
  $scope.next = function() {
    basket.updateCustomer($scope.customer);
    basket.updateTransport(transport.get($scope.transport.code));
    $location.path('/potvrzeni');      
  }
}]);


/**
 * Potvrzeni objednavky.
 * 
 */

module.controller('SummaryCtrl', ['$scope', '$location', 'api', 'basket', function ($scope, $location, api, basket) {
  $scope.step = 'summary';
  if (!basket.hasCustomer() || !basket.hasProducts()) {
    $location.path('/kosik');    
    return;
  }  
  
  $scope.products   = basket.getAll(); 
  $scope.customer   = basket.getCustomer();
  $scope.transport  = basket.getTransport();
  $scope.priceTotal = basket.priceTotal();
  
  $scope.next = function() {
    var data = {
      products: $scope.products,
      customer: $scope.customer,
      transport: $scope.transport
    };  
      
    api.order.create(data, function(info){
      $scope.number = info.number;    
      basket.clear();
    }); 
  }
}]);
    
})();