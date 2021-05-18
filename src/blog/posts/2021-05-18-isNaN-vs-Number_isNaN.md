---
title: Pair of concepts may confuse you in Javascript - Number.isNaN() and isNaN()
description: Expainations of concepts which are easy to be misunderstood in Javascript, Number.isNan() and is NaN() functions
author: Truong Phan
type: article
image: 
date: 2021-05-19
tags:
  - javascript
---
With a long history of development (and chaos) JS has some messy legacy which can't be removed to keep the consitency but only improved by new features/functions. This leads to confusing for developers. This serie is written as notes for myself and others to comprehend these concepts and avoid bugs in development.

## `Number.isNaN()` and `isNaN()`

### What is `NaN`?

`NaN` is shorthand for *Not A Number*, specified in The IEEE Standard for Floating-Point Arithmetic (IEEE 754-2008) for floating-point arithmetic established in 1985. In Javascript context, it is a "*property of the global object. In other words, it is a variable in global scope.*". It has below charactersitics:

* It is considered a `Number` data type
* Equalivent to `Number.NaN`
* `NaN` is the only value in JavaScript which is not equal to itself.
* It's falsy

```javascript

console.log(NaN === NaN) // false
console.log(NaN == NaN) // false

console.log(NaN !== NaN) // true
console.log(NaN != NaN) // true
console.log(typeof(NaN)) // number
a = NaN;
a ? true : false //false
```

### `isNaN()`

As you can see `NaN` even can not compared to itself, so how we can detect if an varaible is a `NaN`, before ES6 we can use function `isNaN()`, yet considered the following examples.

```javascript

isNaN(NaN); // true
isNaN('NaN');   // true
isNaN(undefined); // true
isNaN({}); // true
isNaN('Techika.com'); // true
isNaN(''); // false
isNaN('12abcd') // true
```

To understand this behavior, we need to understand how it works properly.
According from MDN: "*When the argument to the isNaN function is not of type Number, the value is first **coerced to a `Number`**. The resulting value is then tested to determine whether it is `NaN`*"

Then, many people agure that its behavior for non-numeric arguments has been confusing and may cause unexpected result. As the result, the new function was introduced in ECMAScript 2015 (ES6) to solve this problem.

### `Number.isNaN()`

It is a static function from the primitive wrapper object - Number. The most important feature of the function is that it **doesn't force converting the argument to a number**. Because `NaN` is the only value in JavaScript that is not equal to itself, Number.isNaN() has been claimed it is necessary.

```javascript

Number.isNaN(NaN);        // true
Number.isNaN(Number.NaN); // true
Number.isNaN(0 / 0);      // true

// e.g. these would have been true with global isNaN()
Number.isNaN('NaN');      // false
Number.isNaN(undefined);  // false
Number.isNaN({});         // false
Number.isNaN('Techika.com');   // false
Number.isNaN(''); // true
Number.isNaN('12abcd') // false

```

### Conclusion

In my oppinion, `isNaN()` may mot be bug as many people thought but it should be considered when you want to focus on the detection of value. The thing is that we need to comprehend its mechanism that it will try to convert arguments to `Number`. For reliability we should implement `Number.isNaN()` when we want to make sure its argument is `Number` for the comparision.
