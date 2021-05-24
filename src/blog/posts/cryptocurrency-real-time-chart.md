---
title: Develop a basic cryptocurrency chart app with (near) real-time updating, by using Vite, React Hooks, and Plotly
description: How to make a basic cryptocurrency chart app with (near) real-time updating, by using Vite, React Hooks, and Plotly
author: Truong Phan
type: article
image: /media/cryptocurrency-real-time-chart/banner.jpg
date: 2021-04-28
tags:
  - javascript
  - react
  - useeffect
  - plotly
---
Recently, I've made a small investment in ETH cryptocurrency via a local exchange market. I would like to check my investment in my spare time and make a call to buy more or sell. Unfortunately, the exchange market doesn't provide me a chart, but they just have simple APIs to keep tracking of the portfolio balance, and currently ask and bid price by local currency. As the result, it is quite annoyed to keep tracking the trend. Finally, I decided to write a basic price chart for my personal use (I've combined some APIs from the local exchange to included more statistics for my private application). Turns out, making this chart project is more interesting than I expected, and I totally got satisfied when see it's running in real-time.
To begin, I've done some researches to find a solution to provide data for this mini-project. There are some outstanding packages, such as yfinance by Ran Aroussi. I've made some prototypes but, this solution needs a back-end server running and I really don't want to maintain one more server for such a tiny application like this. Fortunately, CoinGecko has provided a wonderful set of APIs for free.

Let start or you can take a look at the [live demo](https://techika-cryptocurrency-chart.netlify.app/) here.

Firstly, I used my favorite bundle tooling Vite to scaffold the project, with react template. You may use create-react-app for your own taste.

```bash
yarn create @vitejs/app trading-chart --template react
```

Then, enter to the `trading-chart` directory and install required packages before running the development server:

```bash
cd trading-chart
yarn
yarn dev
```

Below is the current directory structure.

![Initial project strucutre](https://cdn-images-1.medium.com/max/800/1*pcnjrkhSvuzdXjZCM7bKPQ.png)

Then, open the browser and enter `http://localhost:3000` and you will see the demo page from Vite. Now, we change the index.html file to included third-party libraries and Bootstrap CSS framework for UI.

```html

<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta http-equiv="X-UA-Compatible" content="IE=edge" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Realtime Chart</title>

		<link
			href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta3/dist/css/bootstrap.min.css"
			rel="stylesheet"
			integrity="sha384-eOJMYsd53ii+scO/bJGFsiCZc+5NDVN2yr8+0RDqr0Ql0h+rP48ckxlpbzKgwra6"
			crossorigin="anonymous"
		/>
		<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.4.1/font/bootstrap-icons.css" />
		<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" />
		<script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
	</head>
	<body>
	  <nav class="navbar navbar-expand-lg navbar-light bg-light">
			<span class="text-capitalize ps-3">
				<a class="navbar-brand text-primary fw-bold" href="/"> <img src="/ico/eth.png" />ETH Chart </a>
			</span>
		</nav>
		<div id="root"></div>
		<script type="module" src="/src/main.jsx"></script>
	</body>
</html>

```

## Initialize the chart

In the next steps, we will use useEffect to fetch data from CoinGecko API, then processing it before handling it to Plotly.js to draw. The URL is fetched is:

```bash
https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=1&interval=1m
```

The response will supply us with prices, market capital, and total trading volumes, against USD. An individual item will be in an array format with timestamp and value as screenshots below:

![API Response](https://cdn-images-1.medium.com/max/800/1*6ipocAC6U-VXkFwvP7hHqg.png)

As the tiny scope of this project, I just gonna use Fetch API with a wrapper for handling errors I wrote for previous projects. I created a new file utils.js in the src folder.

```javascript

const callAPI = async (url) => {
	let response = await fetch(url, {
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
		},
	});
	if (!response.ok) {
		const message = `An error has occured: ${response.status}`;
		throw new Error(message);
	}
	return response.json();
};

export default callAPI;
```

Then, I wrote a function in `App.jsx` that make a request to get data and processing into the data dictionary as below for upcoming steps:

```javascript

const fetchData = async () => {
  let data = { index: [], price: [], volumes: [] };
  let result = await callAPI("https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=1&interval=1m");
  for (const item of result.prices) {
      data.index.push(item[0]);
      data.price.push(item[1]);
  }
  for (const item of result.total_volumes) data.volumes.push(item[1]);
  return data;
};
```

Another function to initialize the chart, using API from Plotly.js, and the above `data` as input. You may want to take a look at its [official document](https://plotly.com/javascript/) to explore more features. Basically, in the chunk of code below, I pass the data object to draw 2 line charts, one is for prices and one is for trading volumes with the x-axis is time series.

```javascript

const initChart = (data) => {
		let trace_price = {
			name: "Price ($)",
			x: data.index.map((t) => new Date(t)),
			y: data.price,
			xaxis: "x",
			yaxis: "y1",
			type: "scatter",
			mode: "lines+markers",
			marker: { color: "blue", size: 3 },
		};
		let trace_volumes = {
			name: "Volumne ($B)",
			x: data.index.map((t) => new Date(t)),
			y: data.volumes,
			xaxis: "x",
			yaxis: "y2",
			type: "bar",
			barmode: "relative",
			marker: {
				color: "rgb(49,130,189)",
				opacity: 0.7,
			},
		};
		let layout = {
			autosize: true,
			height: "100%",
			margin: {
				l: 50,
				r: 20,
				t: 35,
				pad: 3,
			},
			showlegend: false,
			xaxis: {
				domain: [1, 1],
				anchor: "y2",
			},
			yaxis: {
				domain: [0.1, 1],
				anchor: "x",
			},
			yaxis2: {
				showticklabels: false,
				domain: [0, 0.1],
				anchor: "x",
			},
			grid: {
				roworder: "bottom to top",
			},
		};
		let config = { responsive: true };
		let series = [trace_price, trace_volumes];
		Plotly.newPlot("chart", series, layout, config);
	};
```

Next, `useEffect` and `useState` gonna be used to set up the data and calculate the latest price of ETH.

```javascript

const [latestPrice, setLatestPrice] = useState(0);

useEffect(() => {
	fetchData().then((chartData) => {
		initChart(chartData);
		setLatestPrice(parseFloat(chartData.price[chartData.price.length - 1]).toFixed(2));
	});
}, []);
```

In fact, the empty array, which was passed to `useEffect` is not a good design pattern. It informed useEffect to call the function once, and it's good for now. We gonna refactor it in the next part.
Now, assembly everything, we have a complete `App.jsx` file as beblow.

```javascript

import React, { useState, useEffect } from "react";
import callAPI from "./utils";

function App() {
	const [latestPrice, setLatestPrice] = useState(0);

	useEffect(() => {
		fetchData().then((chartData) => {
			initChart(chartData);
			setLatestPrice(parseFloat(chartData.price[chartData.price.length - 1]).toFixed(2));
		});
	}, []);

	const fetchData = async () => {
		let data = { index: [], price: [], volumes: [] };
		let result = await callAPI("https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=1&interval=1m");
		for (const item of result.prices) {
			data.index.push(item[0]);
			data.price.push(item[1]);
		}
		for (const item of result.total_volumes) data.volumes.push(item[1]);
		return data;
	};

	const initChart = (data) => {
		let trace_price = {
			name: "Price ($)",
			x: data.index.map((t) => new Date(t)),
			y: data.price,
			xaxis: "x",
			yaxis: "y1",
			type: "scatter",
			mode: "lines+markers",
			marker: { color: "blue", size: 3 },
		};
		let trace_volumes = {
			name: "Volumne ($B)",
			x: data.index.map((t) => new Date(t)),
			y: data.volumes,
			xaxis: "x",
			yaxis: "y2",
			type: "bar",
			barmode: "relative",
			marker: {
				color: "rgb(49,130,189)",
				opacity: 0.7,
			},
		};
		let layout = {
			autosize: true,
			height: "100%",
			margin: {
				l: 50,
				r: 20,
				t: 35,
				pad: 3,
			},
			showlegend: false,
			xaxis: {
				domain: [1, 1],
				anchor: "y2",
			},
			yaxis: {
				domain: [0.1, 1],
				anchor: "x",
			},
			yaxis2: {
				showticklabels: false,
				domain: [0, 0.1],
				anchor: "x",
			},
			grid: {
				roworder: "bottom to top",
			},
		};
		let config = { responsive: true };
		let series = [trace_price, trace_volumes];
		Plotly.newPlot("chart", series, layout, config);
	};

	return (
		<>
			<h2 className='text-center text-primary'>$ {latestPrice}</h2>
			<div id='chart' className='p-0 m-0'></div>
		</>
	);
}

export default App;
```

And the chart should display at `http://localhost:3000`

![Screenshot](https://cdn-images-1.medium.com/max/800/1*OH-qImBG0EJeHHMRA0zyBA.png)

## Real-time updating

Okay, to be honest, it's not a kind of real-time emit as WebSocket or Server-Sent Event technology to afford. There are two reasons for not using them. First of all, is that they are over-complicated for such a tiny project like this. Secondly, I can't find any free API provider, which supports those interfaces (please suggested me if you found anyone.) So, to make it simple enough, I just used `setInterval` function to keep updating the chart after a fixed period (normally 60 seconds, as we fetched data from the API). The data you got is almost real-time updated. Actually, we can set the interval time to be 1 second or shorter but it would be banned from the CoinGeckco API provider.
To implement this procedure, we need a custom function to update the chart from Plotly.js like this.

```javascript

const updateChart = (data) => {
	let trace_price = {
		x: [data.index.map((t) => new Date(t))],
		y: [data.price],
	};
	let trace_volumes = {
		x: [data.index.map((t) => new Date(t))],
		y: [data.volumes],
	};

	Plotly.update("chart", trace_price, {}, 0);
	Plotly.update("chart", trace_volumes, {}, 1);
};
```

Then, we add interval time to `useEffect`

```javascript

useEffect(() => {
	fetchData().then((chartData) => {
		initChart(chartData);
		setLatestPrice(parseFloat(chartData.price[chartData.price.length - 1]).toFixed(2));
	});
	const timerID = setInterval(() => {
		fetchData().then((chartData) => {
			updateChart(chartData);
			setLatestPrice(parseFloat(chartData.price[chartData.price.length - 1]).toFixed(2));
		});
	}, 1000 * 60);
	return () => {
		clearInterval(timerID);
	};
}, []);
	useEffect(() => {
	fetchData().then((chartData) => {
		initChart(chartData);
		setLatestPrice(parseFloat(chartData.price[chartData.price.length - 1]).toFixed(2));
	});
	const timerID = setInterval(() => {
		fetchData().then((chartData) => {
			updateChart(chartData);
			setLatestPrice(parseFloat(chartData.price[chartData.price.length - 1]).toFixed(2));
		});
	}, 1000 * 60);
	return () => {
		clearInterval(timerID);
	};
}, []);

```

And voila, we've finished a real-time USD/ETH chart. Quick and easy. In the completed code, I've added the blink effect whenever the chart is updated, as well as the loading message.

[Live Demo](https://techika-cryptocurrency-chart.netlify.app/)
[Source Code](https://github.com/infantiablue/cryptocurrency-chart)

## Credits

- Unsplash image by [@markuswinkler](https://twitter.com/markuswinkler)