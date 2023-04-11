---
title: Basic Arithmetic Algorithms by Javascript
description: Use Javascript to solve fundamental arithmetic problems
author: Truong Phan
type: article
image: 
date: 2022-05-29
tags:
  - javascript
  - algorithm
  - arithmetic
  - math
---

This is the place, where I keep snippets of Javascript algorithms to process mathematic problems with time complexity for reference later.

## Prime number

### Check if a number is a prime one ?

  Time complexity: O(n)

  ```javascript
  const isPrime = num => {
    for(let i = 2; i < num; i++)
      if(num % i === 0) return false;
    return num > 1;
  }
  ```

  Time complexity: O(sqrt(n))

  ```javascript
  const isPrime = num => {
    for(let i = 2, s = Math.sqrt(num); i <= s; i++)
        if(num % i === 0) return false; 
    return num > 1;
  }
  ```

## Fibonaci

### Caculate the nth number

  Time complexity: O(n)

  ```javascript
  const fib = (n)=> {
    let [a, b] = [0, 1];
    while (--n > 0) [a, b] = [b, a + b];
    return b;
  }    
  ```

## Calculus

### Greatest Common Divisor
  
  Time complexity: O(log(min(a, b)).
  
  _Note:`a` and `b` are integers, `a` > `b` then according to Euclid’s Algorithm_

  ```javascript
  const gcd = (a, b) =>{
    if (!b) return a;
    return gcd(b, a % b);
  }  
  ```

### Smallest Common Multiple

  ```javascript
  function smallestCommons(arr) {
    // https://forum.freecodecamp.org/t/freecodecamp-challenge-guide-smallest-common-multiple/16075
    // Generate list of numbers in ranges then sort
    let list = [...arr.sort((a,b)=>a-b)]
    for(let i=arr[0]+1;i<arr[1];i++){
      list.push(i);
    }

    const gcd = (a, b) =>{
      if (!b) return a;
      return gcd(b, a % b);
    }  
    const lcd = (a,b) => (a*b/gcd(a,b))
    let result = lcd(list[0],list[1])
    for(let i =2;i<list.length;i++){
      result = lcd(result,list[i])
    }
    return result
  }

  ```

### Return a random number in range

  ```javascript
  const roll = (min, max, floatFlag) => {
    let r = Math.random() * (max - min) + min
    return floatFlag ? r : Math.floor(r)
  }
  ```

  Example:

  ```javascript
  let userNames = ['James', 'Jane', 'Ryan', 'Rebecca']

  // Ages between 12 and 64
  // Heights between 5.1 and 6 meters

  let user = {
      name: userNames[roll(0, userNames.length)],
      age: roll(12, 65),
      height: roll(5.1, 6.1, 1).toFixed(1)
  }
  console.log(user)
  ```

To be updated ...
