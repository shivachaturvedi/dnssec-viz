(() => {
    "use strict";
    const myMap = L.map('map', {
        renderer: L.svg()
    }).setView([47.7667, 20.6667], 3);

    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(myMap);

    const queue = d3.queue();

    queue
    //Get countries geojson
        .defer(d3.json, 'javascripts/countries_osm_min.geojson')//'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson')
        //Get Resolver topojson
        .defer(d3.json, 'javascripts/geojson.json')
        //Do stuff
        .await(ready);

    // - Are there any resolvers that claim to support but fail on everything
    function checkLies(allResolvers, code, comparator) {
        let liars = [];
        allResolvers.forEach((resolver) => {
            if (resolver.properties['dns-edns'] === code && comparator(Object.keys(resolver.properties['success-validation']).length))
                liars.push(resolver);

        });
        return liars;
    }

    // — ISP’s who’s routers support most unique algos
    function topISPUniqueAlgoSupport(resolvers, howMany = 10) {
        let groupedISPAlgoList = {};
        resolvers.forEach((resolver) => {
            let ISP = resolver.properties['dns-isp'];
            if (groupedISPAlgoList.hasOwnProperty(ISP)) {
                Object.keys(resolver.properties['success-validation']).forEach(key => {
                    key = key.substring(0, key.length - 2);
                    if (!groupedISPAlgoList[ISP].includes(key))
                        groupedISPAlgoList[ISP].push(key);
                });
            } else {
                let tempArr = [];
                Object.keys(resolver.properties['success-validation']).forEach(key => {
                    key = key.substring(0, key.length - 2);
                    if (!tempArr.includes(key))
                        tempArr.push(key);
                });
                groupedISPAlgoList[ISP] = tempArr;
            }
        });
        let sortedArr = [Object.entries(groupedISPAlgoList).sort((a, b) => b[1].length - a[1].length)][0];
        //console.log(sortedArr);
        return sortedArr.slice(0, howMany);
    }

    // — Group resolver count by ISP and show the top ten
    function topISPByResolverCount(resolvers, howMany = 10) {
        let groupedISPResolverList = {};
        resolvers.forEach((resolver) => {
            let ISP = resolver.properties['dns-isp'];
            if (groupedISPResolverList.hasOwnProperty(ISP)) {
                groupedISPResolverList[ISP] = groupedISPResolverList[ISP] + 1;
            } else {
                groupedISPResolverList[ISP] = 1;
            }
        });
        let sortedArr = [Object.entries(groupedISPResolverList).sort((a, b) => b[1] - a[1])][0];
        return sortedArr.slice(0, howMany);
        //console.log(sortedArr);
    }

    // — ISPs with most routers supporting more than ‘x’ algorithms
    function topISPOfNAlgoSupport(resolvers, N, howMany = 10) {
        let resolversWithNSupport = filterDNSSECResolvers(resolvers, N);
        let ISPWiseList = {};
        resolversWithNSupport.forEach((resolver) => {
            let ISP = resolver.properties['dns-isp'];
            if (ISPWiseList.hasOwnProperty(ISP)) {
                ISPWiseList[ISP] = ISPWiseList[ISP] + 1;
            } else {
                ISPWiseList[ISP] = 1;
            }
        });
        let sortedArr = [Object.entries(ISPWiseList).sort((a, b) => b[1] - a[1])][0];
        //console.log(sortedArr);
        return sortedArr.slice(0, howMany);
    }

    // — Countries with most routers supporting more than ‘x’ algorithms
    function topRegionsOfNAlgoSupport(resolvers, N, groupingCode, howMany = 10) {
        let resolversWithNSupport = filterDNSSECResolvers(resolvers, N);
        let countryWiseList = {};
        resolversWithNSupport.forEach((resolver) => {
            let region = resolver.properties[groupingCode];
            if (region) {
                if (countryWiseList.hasOwnProperty(region)) {
                    countryWiseList[region] = countryWiseList[region] + 1;
                } else {
                    countryWiseList[region] = 1;
                }
            }
        });
        let sortedArr = Object.entries(countryWiseList).sort((a, b) => b[1] - a[1]);
        //console.log(sortedArr);
        return sortedArr.slice(0, howMany);
    }

    // - Countries with maximum unique algorithmic support (Global variable: uniqueList)
    function maxUniqueAlgoSupportingRegions(resolvers, groupingCode, howMany = 10) {
        let uniqueList = {};
        resolvers.forEach((resolver) => {
            let region = resolver.properties[groupingCode];

            if(region) {
                if (region in uniqueList) {
                    Object.keys(resolver.properties['success-validation']).forEach(key => {
                        key = key.substring(0, key.length - 2);
                        if (!uniqueList[region].includes(key))
                            uniqueList[region].push(key);
                    });
                } else {
                    let tempArr = [];
                    Object.keys(resolver.properties['success-validation']).forEach(key => {
                        key = key.substring(0, key.length - 2);
                        if (!tempArr.includes(key))
                            tempArr.push(key);
                    });
                    uniqueList[region] = tempArr;
                }
            }
        });
        let sortedArr = [Object.entries(uniqueList).sort((a, b) => b[1].length - a[1].length)][0];

        return sortedArr.slice(0, howMany);
    }

    // — Regions with maximum percentage of DNSSEC Support (Global variable: percentageList)
    function topDNSSECSupportingRegions(allResolvers, groupingCode, howMany = 10) {
        let percentageList = {};
        let resolvers = filterDNSSECResolvers(allResolvers);
        let groupedDNSSECList = generateGrouping(resolvers);
        let groupedAllList = generateGrouping(allResolvers);

        Object.keys(groupedDNSSECList).forEach((key) => {
            let info = {};
            if (groupedAllList[key]) {
                info.percentage = (groupedDNSSECList[key].length * 100) / groupedAllList[key].length;
                info.total = groupedAllList[key].length;
                percentageList[key] = info;
            }
        });

        function generateGrouping(rList) {
            let grouping = {};
            rList.forEach((resolver) => {
                let region = resolver.properties[groupingCode];
                if (region) {
                    if (region in grouping) {
                        grouping[region].push(resolver);
                    } else {
                        grouping[region] = [resolver];
                    }
                }
            });
            return grouping;
        }

        percentageList = Object.entries(percentageList)
            .sort((a, b) => b[1].percentage - a[1].percentage)
            .slice(0, howMany);

        return percentageList;
    }

    function updateDetailedView(name, topTen) {
        // if(!topTen.length) {
        //     d3.select('#top-algos').select('ul')
        //         .append('li')
        //         .attr('class', 'list-group-item d-flex justify-content-between align-items-center')
        //         .text('No data available');
        //     return;
        // }
        let listItems = d3.select('#top-algos').select('ul').html('')
            .selectAll('li')
            .data([...topTen.keys()])
            .enter().append('li')
            .attr('class', 'list-group-item d-flex justify-content-between align-items-center')
            .html(f => `${f}<span class="badge badge-default badge-primary">${topTen.get(f)}</span>`);

        let title = d3.select('#top-algos').select('ul li.active');
        if (title.empty()) {
            d3.select('#top-algos').select('ul').insert('li', ':first-child')
                .attr('class', 'list-group-item align-items-center active')
                .text(`${name} - Top Algorithms w/ support`);
        } else {
            title.text(name)
        }
    }

    function generateAlgorithmFrequencyList(resolvers, howMany = 3) {
        let frequencyList = {};
        resolvers.forEach(resolver => {
            let tempSuccessValidationObject = resolver.properties['success-validation'];
            Object.keys(tempSuccessValidationObject).forEach(key => {
                if (frequencyList.hasOwnProperty(key)) {
                    frequencyList[key] = frequencyList[key] + 1;
                } else {
                    // At least one resolver supports this algorithm
                    frequencyList[key] = 1;
                }
            });
        });
        let sortedArr = [Object.entries(frequencyList).sort((a, b) => b[1] - a[1])][0];
        return new Map([...sortedArr.slice(0, howMany)]);
    }

    function generateHistogramData(resolvers) {
        let frequencyArray = [];
        resolvers.forEach(resolver => frequencyArray.push(Object.keys(resolver.properties['success-validation']).length));
        return frequencyArray;
    }

    function createHistogram(data) {

        let max = d3.max(data),
            min = d3.min(data);

        if (max <= 3) {
            d3.select("#histogram")
                .html(`<p>
                            <b>Maximum of only ${max} algorithms supported across ${data.length} resolvers</b>
                       </p>`);
            return;
        }
        if (!data.length) {
            return;
        }

        let histogramSvg = d3.select("#histogram").html("").append("svg"),
            margin = {top: 10, right: 30, bottom: 40, left: 30},
            width = 300 - margin.left - margin.right,
            height = 170 - margin.top - margin.bottom,
            g = histogramSvg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")"),
            formatCount = d3.format(",.0f");

        let x = d3.scaleLinear()
            .domain([min, max])
            .range([0, width]);

        let bins = d3.histogram()
            .domain(x.domain())
            .thresholds(x.ticks(3))
            (data);

        let y = d3.scaleLinear()
            .domain([0, d3.max(bins, function (d) {
                return d.length;
            })])
            .range([height, 0]);

        let bar = g.selectAll(".bar")
            .data(bins)
            .enter().append("g")
            .attr("class", "bar")
            .attr("transform", d => `translate(${x(d.x0)},${y(d.length)})`);

        bar.append("rect")
            .attr("x", 1)
            .attr("width", d => {
                let w = x(bins[0].x1) - x(bins[0].x0) - 1;
                return w < 0 ? 0 : w;
            })
            .attr("height", d => height - y(d.length));

        bar.append("text")
            .attr("dy", ".75em")
            .attr("y", -10)
            .attr("x", (x(bins[0].x1) - x(bins[0].x0)) / 2)
            .attr("text-anchor", "middle")
            .text(d => formatCount(d.length));

        g.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x));
    }

    function filterDNSSECResolvers(resolvers, supportCount = 0) {
        return resolvers.filter((resolver) => resolver.properties['success-validation']
            && Object.keys(resolver.properties['success-validation']).length > supportCount);
    }

    function filterResolversByRegion(resolvers, regionCode, property) {
        return resolvers.filter((resolver) => resolver.properties[property] === regionCode);
    }

    function ready(error, countries, resolversData) {

        let resolvers = filterDNSSECResolvers(resolversData.features);
        let totalResolversOfRegion = 0;

        let falsePositives = checkLies(resolversData.features, 1, (a) => a === 0).length;
        let percent = parseFloat(falsePositives*100/resolversData.features.length).toFixed(2);
        function updateCountryInfo(props) {
            let html;
            if (props && props.resolvers) {
                html = '<h4>World DNSSEC Support Status</h4>' + (props ?
                    '<b>' + props.name + '</b><br />' + props.density
                    + '<span> resolvers out of </span>' + props.resolvers + ' resolvers' + ' support DNSSEC'
                    : 'Hover over a region');
            } else {
                html = '<h4>World DNS Resolvers Status</h4>' + (props ?
                    '<b>' + props.name + '</b><br />' + 'No data available'
                    : 'Hover over a region');
            }
            return html;
        }

        function updateStateInfo(props) {
            let html;
            if (props.density) {
                html = `<h4>${props.country} DNSSEC Support status </h4><b>
                        ${props.name}</b><br />${props.density}<span> resolver(s) support DNSSEC`;
            } else {
                html = `<h4>${props.country} DNSSEC Support status </h4><b>${props.name}</b><br />No data available`;
            }
            return html;
        }

        function calculateDensity(regionCode, property) {
            let regionSpecificResolvers = filterResolversByRegion(resolvers, regionCode, property);
            totalResolversOfRegion = filterResolversByRegion(resolversData.features, regionCode, property).length;
            return regionSpecificResolvers.length;
        }

        function resetHighlight(e) {
            if (e.target.feature.properties.type === 'country') {
                geojson.resetStyle(e.target);
            } else {
                stateGeoJson.resetStyle(e.target);
            }
            info.update();
        }

        function zoomToCountry(e) {
            let countryName = e.target.feature.properties.name;
            let countryCode = e.target.feature.properties.iso_a2;
            let countryResolvers = filterResolversByRegion(resolvers, countryCode, 'dns-ccode');
            updateDetailedView(countryName, generateAlgorithmFrequencyList(countryResolvers));
            createHistogram(generateHistogramData(countryResolvers));
            e.target.remove();
            updateISPInfo(countryResolvers);
            updateRegionInfo(countryResolvers, 'subdivision_code');
            d3.json(`javascripts/countries/${countryCode}_level_4.geojson`, states => createStateHeatmap(countryResolvers, states, countryName));
            myMap.flyToBounds(e.target.getBounds(), {animate: true});
        }

        function zoomState(e) {
            let stateCode = e.target.feature.properties['ISO3166-2'];
            let stateName = e.target.feature.properties['name'];
            let extractedFeatures = filterResolversByRegion(resolvers, stateCode, 'subdivision_code');
            updateDetailedView(stateName, generateAlgorithmFrequencyList(extractedFeatures));
            createHistogram(generateHistogramData(extractedFeatures));
            placeStateMarkers(extractedFeatures);
            updateISPInfo(extractedFeatures);
            updateRegionInfo(extractedFeatures, 'subdivision_code');
            myMap.flyToBounds(e.target.getBounds(), {animate: true});
        }

        function displayResolvers(resolvers, howMany = 2) {
            let filteredSet = filterDNSSECResolvers(resolvers, howMany);

            if (Object.keys(filteredSet).length) {

                d3.select('#resolver-list').select('ul')
                    .html('')
                    .selectAll('li')
                    .data(filteredSet)
                    .enter().append('li')
                    .attr('class', 'list-group-item align-items-center')
                    .html(d => `<a>${d.ip}: ${d.properties['dns-ccode']}</a>`)
                    .on('click', resolver => {
                        let coordinates = resolver.geometry.coordinates,
                            [resolverIcon, popupHTML] = getMarkerHTML(resolver);
                        let marker = L.marker(coordinates, {icon: resolverIcon}).bindPopup(popupHTML);
                        marker.addTo(myMap);
                        let latLngs = [marker.getLatLng()];
                        let markerBounds = L.latLngBounds(latLngs);
                        myMap.flyToBounds(markerBounds, {animate: true});
                    });
            } else {
                d3.select('#resolver-list').select('ul')
                    .html('').append('li')
                    .attr('class', 'list-group-item align-items-center')
                    .text('No data found');
            }

            let title = d3.select('#resolver-list').select('ul li.active');
            if (title.empty()) {
                d3.select('#resolver-list').select('ul').insert('li', ':first-child')
                    .attr('class', 'list-group-item align-items-center active')
                    .text(`Top resolvers supporting at least ${howMany + 1} algorithms`);
            } else {
                title.text(`Top resolvers supporting at least ${howMany + 1} algorithms`);
            }
        }

        function getMarkerHTML(resolver) {
            let success = Object.keys(resolver.properties['success-validation']).length;
            let succeeded = Object.keys(resolver.properties['success-validation']);
            let totalAlgorithms = 48;
            let successPercentage = (success * 100) / totalAlgorithms;
            let svgIcon = `/images/map-marker-red.svg`;

            if (successPercentage > 50) {
                svgIcon = `public/images/map-marker-green.svg`;
            }
            const resolverIcon = L.icon({
                iconUrl: svgIcon,
                iconSize: [40, 40],
                iconAnchor: [-20, 40],
                popupAnchor: [40, -40]
            });
            let text = `Verified ${success} out of ${totalAlgorithms} algorithms successfully:<br/>`;
            let popupHTML = `<b>${text}</b><br/>${succeeded.toString()}`;

            return [resolverIcon, popupHTML];
        }

        function placeStateMarkers(resolvers) {
            const resolverCluster = L.markerClusterGroup();

            resolvers.forEach((resolver) => {

                let [resolverIcon, popupHTML] = getMarkerHTML(resolver);

                resolverCluster
                    .addLayer(
                        L.marker([resolver.geometry.coordinates[0],
                            resolver.geometry.coordinates[1]], {icon: resolverIcon})
                            .bindPopup(popupHTML));
            });
            myMap.addLayer(resolverCluster);
        }

        function createStateHeatmap(countryResolvers, states, countryName) {

            states.features = states.features.filter(feature => feature.properties['ISO3166-2']);

            states.features.forEach(feature => {
                feature.properties.density = calculateDensity(feature.properties['ISO3166-2'], "subdivision_code");
                feature.properties.type = 'state';
                feature.properties.country = countryName;
            });

            let stateHeatMapColor = d3.scaleThreshold()
                .domain([d3.min(states.features, d => d.properties.density),
                    d3.max(states.features, d => d.properties.density)])
                .range(['#fff7fb', '#ece7f2', '#d0d1e6', '#a6bddb', '#74a9cf', '#3690c0', '#0570b0', '#045a8d', '#023858']);

            displayResolvers(countryResolvers);

            stateGeoJson = L.geoJson(states, {style: stateStyle, onEachFeature: onEachStateFeature}).addTo(myMap);

            function stateStyle(feature) {
                return {
                    fillColor: stateHeatMapColor(feature.properties.density)
                };
            }
        }

        function onEachStateFeature(feature, layer) {
            layer.on({
                click: zoomState,
                mouseover: highlightFeature,
                mouseout: resetHighlight
            });
        }

        function onEachFeature(feature, layer) {
            layer.on({
                mouseover: highlightFeature,
                mouseout: resetHighlight,
                click: zoomToCountry
            });
        }

        function highlightFeature(e) {
            let layer = e.target;

            layer.setStyle({
                weight: 5,
                color: '#666',
                dashArray: '',
                fillOpacity: 0.7
            });

            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                layer.bringToFront();
            }
            info.update(layer.feature.properties);
        }

        function style(feature) {
            return {
                fillColor: heatMapColor(feature.properties.density),
                weight: 2,
                opacity: 1,
                color: 'white',
                dashArray: '3',
                fillOpacity: 0.7
            };
        }

        countries.features.forEach((feature) => {
            feature.properties.density = calculateDensity(feature.properties["iso_a2"], "dns-ccode");
            feature.properties.resolvers = totalResolversOfRegion;
            feature.properties.type = 'country';
        });

        //console.log(dnssecSupportDict);

        const steps = d3.range(d3.min(countries.features, d => d.properties.density),
            d3.max(countries.features, d => d.properties.density), 20);

        const heatMapColor = d3.scaleThreshold()
            .domain(steps)
            .range(['#fff7fb', '#ece7f2', '#d0d1e6', '#a6bddb', '#74a9cf', '#3690c0', '#0570b0', '#045a8d', '#023858']);
        let geojson = L.geoJson(countries, {style: style, onEachFeature: onEachFeature}).addTo(myMap);

        updateDetailedView('World', generateAlgorithmFrequencyList(resolvers));
        createHistogram(generateHistogramData(resolvers));
        displayResolvers(resolvers);
        updateISPInfo(resolvers);
        updateRegionInfo(resolvers, 'dns-ccode');
        let stateGeoJson;

        const legend = L.control({position: 'bottomright'});

        legend.onAdd = function (map) {

            let div = L.DomUtil.create('div', 'info legend'),
                grades = steps,
                labels = [];

            // loop through our density intervals and generate a label with a colored square for each interval
            for (let i = 0; i < grades.length; i++) {
                div.innerHTML +=
                    '<i style="background:' + heatMapColor(grades[i] + 1) + '"></i> ' +
                    grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
            }

            return div;
        };

        legend.addTo(myMap);

        const info = L.control();

        info.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
            this.update();
            return this._div;
        };

// method that we will use to update the control based on feature properties passed
        info.update = function (props) {
            if (props && props.type === 'country') {
                this._div.innerHTML = updateCountryInfo(props);
            } else if (props && props.type === 'state') {
                this._div.innerHTML = updateStateInfo(props);
            } else {
                this._div.innerHTML = `<h4>World DNSSEC Support Status</h4> 
                                        <b>False Positives: ${percent}</b><br>
                                        Hover over a region
                                        `;
            }
        };

        info.addTo(myMap);

        function updateISPInfo(resolvers) {
            updateISPMaxAlgoInfo(resolvers);
            updateISP3AlgoInfo(resolvers);
            updateISPMaxDNSSECInfo(resolvers);
        }

        function updateISP3AlgoInfo(resolvers) {
            let ispList = topISPOfNAlgoSupport(resolvers, 2, 3);

            if(!ispList.length) {
                d3.select('.isp #algo3').select('ul').html('').append('li')
                    .attr('class', 'list-group-item d-flex justify-content-between align-items-center text-danger')
                    .text('No data found');
                return;
            }

            let selection = d3.select('.isp #algo3').select('ul')
                .html('').selectAll('li').data(ispList)
                .enter();

            selection.append('li')
                .attr('class', 'list-group-item d-flex justify-content-between align-items-center')
                .html(isp => {
                return `${isp[0]}: <span class = "badge badge-default badge-primary">${isp[1]}</span>`;
            });
        }

        function updateISPMaxAlgoInfo(resolvers) {
            let ispList = topISPUniqueAlgoSupport(resolvers, 3);

            if(!ispList.length) {
                d3.select('.isp #maxalgo').select('ul').html('').append('li')
                    .attr('class', 'list-group-item d-flex justify-content-between align-items-center text-danger')
                    .text('No data found');
                return;
            }

            let selection = d3.select('.isp #maxalgo').select('ul')
                .html('').selectAll('li').data(ispList)
                .enter();

            selection.append('li')
                .attr('class', 'list-group-item d-flex justify-content-between align-items-center')
                .html(isp => {
                return `${isp[0]}: <span class = "badge badge-default badge-primary">${isp[1].length}</span>`;
            });
        }

        function updateISPMaxDNSSECInfo(resolvers) {

            let ispList = topISPByResolverCount(resolvers, 3);

            if(!ispList.length) {
                d3.select('.isp #max-dnssec').select('ul').html('').append('li')
                    .attr('class', 'list-group-item d-flex justify-content-between align-items-center text-danger')
                    .text('No data found');
                return;
            }

            let selection = d3.select('.isp #max-dnssec').select('ul')
                .html('').selectAll('li').data(ispList)
                .enter();

            selection.append('li')
                .attr('class', 'list-group-item d-flex justify-content-between align-items-center')
                .html(isp => {
                return `${isp[0]} <span class = "badge badge-default badge-primary">${isp[1]}</span>`;
            });
        }

        function updateRegionInfo(resolvers, groupingCode) {
            updateRegionUniqueAlgoInfo(resolvers, groupingCode);
            updateRegion3AlgoInfo(resolvers, groupingCode);
            updateRegionMaxDNSSECInfo(resolvers, groupingCode);
        }

        function updateRegionUniqueAlgoInfo(resolvers, groupingCode) {
            let regionList = maxUniqueAlgoSupportingRegions(resolvers, groupingCode, 3);

            if(!regionList.length) {
                d3.select('#region-maxalgo').select('ul').html('').append('li')
                    .attr('class', 'list-group-item d-flex justify-content-between align-items-center text-danger')
                    .text('No data found');
                return;
            }

            let selection = d3.select('#region-maxalgo').select('ul')
                .html('').selectAll('li').data(regionList)
                .enter();

            selection.append('li')
                .attr('class', 'list-group-item d-flex justify-content-between align-items-center')
                .html(region => {
                return `${region[0]} <span class = "badge badge-default badge-primary">${region[1].length}</span>`;
            });
        }

        function updateRegion3AlgoInfo(resolvers, groupingCode) {
            let regionList = topRegionsOfNAlgoSupport(resolvers, 2, groupingCode, 3);

            if(!regionList.length) {
                d3.select('#region-3algo').select('ul').html('').append('li')
                    .attr('class', 'list-group-item d-flex justify-content-between align-items-center text-danger')
                    .text('No data found');
                return;
            }

            let selection = d3.select('#region-3algo').select('ul')
                .html('').selectAll('li').data(regionList)
                .enter();

            selection.append('li')
                .attr('class', 'list-group-item d-flex justify-content-between align-items-center')
                .html(region => {
                return `${region[0]} <span class = "badge badge-default badge-primary">${region[1]}</span>`;
            });
        }

        function updateRegionMaxDNSSECInfo(resolvers, groupingCode) {
            let regionList = topDNSSECSupportingRegions(resolvers, groupingCode, 3);

            if(!regionList.length) {
                d3.select('#regions-dnssec').select('ul').html('').append('li')
                    .attr('class', 'list-group-item d-flex justify-content-between align-items-center text-danger')
                    .text('No data found');
                return;
            }

            let selection = d3.select('#regions-dnssec').select('ul')
                .html('').selectAll('li').data(regionList)
                .enter();

            selection.append('li')
                .attr('class', 'list-group-item d-flex justify-content-between align-items-center')
                .html(region => {
                return `${region[0]} <span class = "badge badge-default badge-primary">${region[1].percentage}</span>`;
            });
        }
    }
})();