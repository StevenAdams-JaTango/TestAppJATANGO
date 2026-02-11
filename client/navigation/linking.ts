import { LinkingOptions } from "@react-navigation/native";
import * as Linking from "expo-linking";

const prefix = Linking.createURL("/");

// Using 'any' for complex nested navigation types
export const linking: LinkingOptions<any> = {
  prefixes: [prefix, "jatango://", "https://jatango.com"],
  config: {
    screens: {
      Main: {
        path: "",
        screens: {
          HomeTab: {
            path: "home",
            screens: {
              Home: "",
            },
          },
          ExploreTab: {
            path: "explore",
            screens: {
              Explore: "",
            },
          },
          ShortsTab: {
            path: "shorts",
            screens: {
              Shorts: "",
            },
          },
          ShowsTab: {
            path: "shows",
            screens: {
              Shows: "",
              ShowSetup: "setup/:draftId?",
            },
          },
          ProfileTab: {
            path: "profile",
            screens: {
              Profile: "",
            },
          },
        },
      },
      LiveStream: "live/:streamId",
      Broadcaster: "broadcast/:draftId?",
      ProductDetail: "product/:productId",
      Settings: "settings",
      EndedShow: {
        path: "EndedShow",
        parse: { showId: (id: string) => id },
      },
      ShowSummary: {
        path: "ShowSummary",
        parse: { showId: (id: string) => id },
      },
      Products: "products",
      AddProduct: "products/add/:productId?",
      Cart: "cart",
      Checkout: "checkout/:sellerId",
      OrderConfirmation: "order-confirmation/:orderId",
      SavedPaymentMethods: "payment-methods",
      ShippingAddresses: "addresses",
      AddAddress: "addresses/add/:addressId?",
      Orders: "orders",
      OrderDetail: "orders/:orderId",
      UploadShort: "upload-short",
      StoreShortsViewer: "store-shorts/:sellerId",
      SavedProducts: "saved-products",
      StoreAddress: "store-address",
      Sales: "sales",
      SaleDetail: "sales/:orderId",
    },
  },
};
