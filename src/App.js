import React from 'react';

function getWeatherIcon(wmoCode) {
  const icons = new Map([
    [[0], "☀️"],
    [[1], "🌤️"],
    [[2], "⛅"],
    [[3], "☁️"],
    [[45, 48], "🌫️"],
    [[51, 56, 61, 66, 80], "🌦️"],
    [[53, 55, 63, 65, 57, 67, 81, 82], "🌧️"],
    [[71, 73, 75, 77, 85, 86], "🌨️"],
    [[95], "🌩️"],
    [[96, 99], "⛈️"],
  ]);
  const arr = [...icons.keys()].find((key) => key.includes(wmoCode));
  if (!arr) return "NOT FOUND";
  return icons.get(arr);
}

function convertToFlag(countryCode) {
  if (!countryCode) return "";

  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

function formatDay(dateStr) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
  }).format(new Date(dateStr));
}



class App extends React.Component {
  state = {
    location: 'lisbon',
    isLoading: false,
    displayLocation: '',
    weather: null,
    error: ''
  }

  fetchWeather = async () => {
    try {
    if(this.state.location.length <= 2) return
    this.setState({ isLoading: true, error: '' });
    const location = this.state.location.trim();
    if (!location) throw new Error("Enter a location to search.");

    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}`
    );
    if (!geoRes.ok) throw new Error("Could not look up that location.");
    const geoData = await geoRes.json();

    if (!Array.isArray(geoData.results) || geoData.results.length === 0) {
      throw new Error("Location not found. Try another city.");
    }

    const { latitude, longitude, timezone, name, country_code } = geoData.results[0];
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=${encodeURIComponent(timezone)}&daily=weathercode,temperature_2m_max,temperature_2m_min`
    );
    if (!weatherRes.ok) throw new Error("Could not load weather for that location.");
    const weatherData = await weatherRes.json();
    const daily = weatherData.daily;

    if (
      !daily ||
      !Array.isArray(daily.time) ||
      !Array.isArray(daily.temperature_2m_max) ||
      !Array.isArray(daily.temperature_2m_min) ||
      !(Array.isArray(daily.weathercode) || Array.isArray(daily.weather_code))
    ) {
      throw new Error("Weather data was incomplete. Please try again.");
    }

    this.setState({
      displayLocation: `${name} ${convertToFlag(country_code)}`,
      weather: daily
    });
  } catch (err) {
    console.error(err);
    this.setState({ error: err.message || "Unable to load weather. Please try again." });
  } finally {
    this.setState({ isLoading: false });
  }
  }

  componentDidMount() {
    this.fetchWeather();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.location !== this.state.location) {
      this.fetchWeather();
    }
  }
  onChangeLocation = (e) => this.setState({ location: e.target.value })
  render() {
    return <div className="app">
      <h1>Classy Weather</h1>
        <Input location={this.state.location} onChangeLocation={this.onChangeLocation}/>
        {/* <button onClick={this.fetchWeather}>Get Weather</button> */}
        {this.state.isLoading && <p className='loader'>Loading...</p>}
        {this.state.error && <p role="alert">{this.state.error}</p>}

        {this.state.weather && <Weather weather={this.state.weather} location={this.state.displayLocation}/>}
      </div>;
  }
}

export default App;

class Input extends React.Component {
  render() {
    return(<div>
        <input type="text" placeholder="Search for location" value={this.props.location} 
        onChange={this.props.onChangeLocation} />
        </div>)
  }
}
class Weather extends React.Component {
  render() {
    const { temperature_2m_max:max ,
      temperature_2m_min:min ,
      time:dates,
    weathercode:codes,
    weather_code:alternateCodes,
     } = this.props.weather;
    const weatherCodes = codes || alternateCodes;

    if (
    !Array.isArray(dates) ||
    !Array.isArray(max) ||
    !Array.isArray(min) ||
    !Array.isArray(weatherCodes)
    ) {
    return null;
    }
    
   return( <div>
      <h2>Weather {this.props.location}</h2> 
      <ul className='weather'>
      {dates.map((date, i) => (
        <Day
          date={date}
          max={max[i]}
          min={min[i]}
          code={weatherCodes[i]}
          key={date}
          isToday={i === 0}
        />
      ))}
      </ul>
    </div>)
  }
}

class Day extends React.Component {
  render() {
    const {date, max, min, code, isToday} = this.props;
    return (<li className='day'>
        <span>{getWeatherIcon(code)}</span>
        <p>{isToday ? "Today" : formatDay(date)}</p>
        <p>{Math.floor(min)}&deg; &mdash; {Math.ceil(max)}&deg;</p>
    </li>)
  }
}

