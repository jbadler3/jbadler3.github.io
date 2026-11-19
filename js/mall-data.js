/* Shared fictional mall dataset used by all three prototypes.
   x = position along the main hallway (0 = west end, 100 = east end).
   side = which side of the hallway the storefront faces (top = north, bottom = south). */
window.MALL = {
  name: "Riverside Commons",
  floors: [1, 2, 3],
  entrance: { id: "entrance", name: "Main Entrance", short: "Entrance", floor: 1, x: 0, side: "mid", cat: "Entrance" },
  connectors: [
    { id: "escA", name: "Escalator A", short: "Esc A", type: "escalator", x: 25 },
    { id: "elev", name: "Elevator", short: "Elev", type: "elevator", x: 55 },
    { id: "escB", name: "Escalator B", short: "Esc B", type: "escalator", x: 85 }
  ],
  stores: [
    // Floor 1
    { id: "volt",     name: "Volt Electronics",          short: "Volt Electronics", cat: "Electronics", floor: 1, x: 12, side: "top" },
    { id: "bean",     name: "Bean & Leaf Coffee",        short: "Bean & Leaf",      cat: "Food",        floor: 1, x: 40, side: "top" },
    { id: "stride",   name: "StrideRun Shoes",           short: "StrideRun Shoes",  cat: "Shoes",       floor: 1, x: 66, side: "top" },
    { id: "hartwell", name: "Hartwell Department Store", short: "Hartwell Dept.",   cat: "Department",  floor: 1, x: 93, side: "top" },
    { id: "rr1",      name: "Restrooms (Floor 1)",       short: "Restrooms",        cat: "Restrooms",   floor: 1, x: 42, side: "bottom" },
    { id: "care",     name: "CarePlus Pharmacy",         short: "CarePlus Pharmacy",cat: "Pharmacy",    floor: 1, x: 92, side: "bottom" },
    // Floor 2
    { id: "thread",   name: "Threadline Clothing",       short: "Threadline",       cat: "Clothing",    floor: 2, x: 12, side: "top" },
    { id: "techhub",  name: "Tech Hub",                  short: "Tech Hub",         cat: "Electronics", floor: 2, x: 40, side: "top" },
    { id: "sole",     name: "Sole Society Shoes",        short: "Sole Society",     cat: "Shoes",       floor: 2, x: 66, side: "top" },
    { id: "sunny",    name: "Sunny Days Outdoor",        short: "Sunny Days",       cat: "Outdoor",     floor: 2, x: 93, side: "top" },
    { id: "books",    name: "PageTurn Books",            short: "PageTurn Books",   cat: "Books",       floor: 2, x: 14, side: "bottom" },
    { id: "rr2",      name: "Restrooms (Floor 2)",       short: "Restrooms",        cat: "Restrooms",   floor: 2, x: 46, side: "bottom" },
    { id: "glow",     name: "Glow Beauty",               short: "Glow Beauty",      cat: "Beauty",      floor: 2, x: 92, side: "bottom" },
    // Floor 3
    { id: "noodle",   name: "Noodle Bar (Food Court)",   short: "Noodle Bar",       cat: "Food",        floor: 3, x: 36, side: "top" },
    { id: "pizza",    name: "Pizza Corner (Food Court)", short: "Pizza Corner",     cat: "Food",        floor: 3, x: 62, side: "top" },
    { id: "rr3",      name: "Restrooms (Floor 3)",       short: "Restrooms",        cat: "Restrooms",   floor: 3, x: 18, side: "bottom" },
    { id: "cinema",   name: "Starlight Cinema",          short: "Starlight Cinema", cat: "Entertainment", floor: 3, x: 88, side: "bottom" }
  ],
  /* Inventory for Prototype A (reserve-ahead). qty 0 = out of stock. */
  items: {
    charger:  { name: "USB-C phone charger (20W)", keywords: ["charger", "phone charger", "usb", "usb-c", "cable", "power"],
                stock: [ { store: "volt", price: 19.99, qty: 6 }, { store: "techhub", price: 24.99, qty: 2 }, { store: "care", price: 14.99, qty: 0 }, { store: "hartwell", price: 22.00, qty: 3 } ] },
    socks:    { name: "Running socks (3-pack)", keywords: ["socks", "running socks", "sock"],
                stock: [ { store: "stride", price: 12.00, qty: 10 }, { store: "sole", price: 14.50, qty: 1 }, { store: "hartwell", price: 9.99, qty: 0 }, { store: "sunny", price: 11.00, qty: 4 } ] },
    sunscreen:{ name: "Sunscreen SPF 50", keywords: ["sunscreen", "sunblock", "spf", "sun"],
                stock: [ { store: "care", price: 9.49, qty: 8 }, { store: "sunny", price: 13.99, qty: 5 }, { store: "glow", price: 18.00, qty: 2 } ] },
    headphones:{ name: "Wired earbuds", keywords: ["headphones", "earbuds", "earphones"],
                stock: [ { store: "volt", price: 15.00, qty: 4 }, { store: "techhub", price: 12.99, qty: 0 } ] },
    bottle:   { name: "Water bottle (24 oz)", keywords: ["water bottle", "bottle", "water"],
                stock: [ { store: "sunny", price: 16.00, qty: 7 }, { store: "hartwell", price: 12.50, qty: 2 } ] }
  }
};
