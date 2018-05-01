const RESULTS_CHUNK_COUNT = 7;

var pusher = new Pusher("072199c2a76f32764414", {
  cluster: "eu",
  encrypted: true
});

const vm = new Vue({
  el: "#app",
  data: {
    products: [],
    results: [],
    price: 9.9,
    total: 0,
    cart: [],
    currentSearch: "90s",
    lastSearch: "",
    loading: false,
    pusherUpdating: false
  },
  computed: {
    showNoMoreProducts: function() {
      return (
        this.results.length && this.results.length === this.products.length
      );
    }
  },
  watch: {
    cart: {
      handler: function(val) {
        console.log("cart update handler");
        if (this.pusherUpdating) {
          this.pusherUpdating = false;
          return;
        }
        this.$http.post("/cart_update", val);
      },
      deep: true
    }
  },
  methods: {
    addToKart: function(index) {
      const product = this.products[index];
      this.total += this.price;
      const candidate = this.cart.filter(item => item.id === product.id)[0];

      if (candidate) {
        candidate.qty++;
        return;
      }

      this.cart.push({ ...product, qty: 1 });
    },
    increment: function(product) {
      this.total += this.price;
      product.qty++;
    },
    decrement: function(product) {
      this.total -= this.price;
      product.qty--;

      if (product.qty > 0) {
        return;
      }

      //console.log('index is: ',this.cart.findIndex(item => item.id === product.id))
      this.cart.splice(this.cart.findIndex(item => item.id === product.id), 1);
    },
    onSubmit: function() {
      if (!this.currentSearch) {
        return;
      }
      this.loading = true;
      this.products = [];
      this.$http
        .get("/search/" + this.currentSearch)
        .then(response => {
          this.lastSearch = this.currentSearch;
          this.results = response.data;
          this.appendProducts();
          this.loading = false;
        })
        .catch(err => {
          console.log("App Error: error loading resource", err);
        });
    },
    appendProducts: function() {
      if (this.products.length >= this.results.length) {
        return;
      }
      const toAppend = this.results.slice(
        this.products.length,
        this.products.length + RESULTS_CHUNK_COUNT
      );
      this.products = this.products.concat(toAppend);
    }
  },
  filters: {
    currency: function(ammount = 0) {
      return "€ " + ammount.toFixed(2);
    }
  },
  mounted: function() {
    const vueInstance = this;
    const channel = pusher.subscribe("cart");
    channel.bind("update", function(data) {
      vueInstance.pusherUpdating = true;
      vueInstance.cart = data;
      vueInstance.total = 0;
      vueInstance.cart.forEach(item => {
        vueInstance.total += vueInstance.price * item.qty;
      });
      console.log("just updated the data");
    });
    const endOfListElem = document.querySelector(".product-list-end");
    const viewportWatcher = scrollMonitor.create(endOfListElem);
    viewportWatcher.enterViewport(() => {
      vueInstance.appendProducts();
    });
    this.onSubmit();
  }
});
