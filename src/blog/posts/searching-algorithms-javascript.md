---
title: Basic Searching Algorithms by Javascript
description: Use Javascript to search data with linear search and binary search, with practical examples and time complexity.
author: Truong Phan
type: article
image:
date: 2026-08-24
tags:
  - javascript
  - algorithm
  - search
  - data-structure
---

After basic arithmetic algorithms, searching is another fundamental topic to learn. In daily work, we search a user by ID, find a product in a list, or look up a value in sorted data. This is the place where I keep basic Javascript searching algorithms with practical examples and time complexity for reference later.

## Linear search

### Find a user by ID

Linear search checks each item from the beginning until it finds the expected value. It works with unsorted data, so it is usually the simplest choice for a small list.

Time complexity: O(n)

```javascript
const findUserById = (users, id) => {
  for (const user of users) {
    if (user.id === id) return user;
  }
  return null;
}
```

Example:

```javascript
const users = [
  { id: 101, name: 'James' },
  { id: 203, name: 'Jane' },
  { id: 305, name: 'Ryan' }
]

console.log(findUserById(users, 203))
// { id: 203, name: 'Jane' }

console.log(findUserById(users, 999))
// null
```

For a short list, this is clear enough. The problem appears when the list has many items and we need to search it many times.

## Binary search

### Find a number in sorted data

Binary search is faster because it removes half of the remaining data after every comparison. However, the input must be sorted first.

Time complexity: O(log n)

```javascript
const binarySearch = (numbers, target) => {
  let left = 0
  let right = numbers.length - 1

  while (left <= right) {
    const middle = Math.floor((left + right) / 2)
    const value = numbers[middle]

    if (value === target) return middle
    if (value < target) left = middle + 1
    else right = middle - 1
  }

  return -1
}
```

Example:

```javascript
const productIds = [11, 24, 38, 42, 57, 63, 79, 88, 91]

console.log(binarySearch(productIds, 57))
// 4

console.log(binarySearch(productIds, 50))
// -1
```

The result is the index of the item. For example, `productIds[4]` is `57`. When the function returns `-1`, the value does not exist in the list.

### Search products by price

When we get data from an API, the array may not be sorted. We need to sort numbers correctly before using binary search. Javascript default `sort()` converts numbers to strings, so we should provide a compare function.

```javascript
const prices = [120, 9, 75, 45, 300, 20]
const sortedPrices = [...prices].sort((a, b) => a - b)

console.log(sortedPrices)
// [9, 20, 45, 75, 120, 300]

console.log(binarySearch(sortedPrices, 75))
// 3
```

`[...prices]` creates a new array, so the original `prices` list is not changed by `sort()`.

## Linear search vs binary search

Use linear search when data is small or unsorted. Use binary search when data is already sorted and search performance matters. Binary search is not always the better choice because sorting also takes time, especially when the data changes often.

## Bottom Line

The important point is not only writing the function but also understanding its input. Linear search can work with every array. Binary search is much faster, but only works correctly with sorted data. In the next article, we can look at sorting algorithms and see why the way we sort data matters.
