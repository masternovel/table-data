/* ===== FUEL PRICE PAGE SCRIPT v1.0 ===== */
(function() {
    'use strict';
    
    // Wait for CFG to be available
    if (typeof CFG === 'undefined') {
        console.error('CFG configuration not found. Please define CFG before loading this script.');
        return;
    }
    
    const {state, city, stateSlug, citySlug, fuelType, fuelLabel, capitalCity} = CFG;
    
    // ===== UTILITIES =====
    const cache = {};
    const fetchJSON = url => cache[url] || (cache[url] = fetch(url).then(r => r.json()));
    const goToURL = e => {
        const url = e.options[e.selectedIndex].dataset.url;
        url && url !== '#' && (location.href = url);
    };
    
    const formatDate = dateStr => {
        const d = new Date(dateStr);
        return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2,'0')}, ${d.getFullYear()}`;
    };
    
    const getPriceIndicator = change => ({
        arrow: change > 0 ? '▲' : change < 0 ? '▼' : '▪',
        color: change > 0 ? 'red' : change < 0 ? 'green' : 'black'
    });
    
    const updateElement = (id, content, removePlaceholder = true) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (typeof content === 'string') el.innerHTML = content;
        else el.textContent = content;
        if (removePlaceholder) el.classList.remove('fuel-placeholder');
    };
    
    // ===== BROWSER BACK FIX =====
    window.addEventListener('pageshow', e => {
        if (e.persisted || (window.performance?.navigation.type === 2)) {
            const ss = document.getElementById('stateSelect');
            const cs = document.getElementById('citySelect');
            if (ss) ss.value = state;
            if (cs) cs.value = city;
        }
    }, {passive: true});
    
    // ===== DEFERRED SCHEMA =====
    const injectSchema = tableData => {
        requestIdleCallback(() => {
            document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
                if (!s.id || s.id !== 'frisqoo-custom-schema') s.remove();
            });
            
            const baseUrl = location.href;
            const org = {"@type": "Organization", "name": "Frisqoo", "url": "https://www.frisqoo.com/"};
            let temporal = "";
            
            if (tableData?.length > 1) {
                const start = new Date(tableData[tableData.length - 1][0]).toISOString().split('T')[0];
                const end = new Date().toISOString().split('T')[0];
                temporal = `${start}/${end}`;
            }
            
            const schema = {
                "@context": "https://schema.org",
                "@graph": [
                    {
                        "@type": "WebPage",
                        "@id": `${baseUrl}#webpage`,
                        "name": `${fuelLabel} Price in ${city} - Today (${currentDate})`,
                        "url": baseUrl,
                        "description": `Get the latest ${fuelLabel.toLowerCase()} price in ${city} for ${currentDate}. This page provides a complete daily price update, a 10-day historical price trend, a state-wide price comparison, and answers to frequently asked questions.`,
                        "mainEntity": {"@id": `${baseUrl}#dataset`}
                    },
                    {
                        "@type": "Dataset",
                        "@id": `${baseUrl}#dataset`,
                        "mainEntityOfPage": {"@id": `${baseUrl}#webpage`},
                        "name": `Daily ${fuelLabel} Price History and Today's Rate for ${city}`,
                        "description": `A 10-day price history dataset for ${fuelLabel.toLowerCase()} in ${city}, ${state}.`,
                        "keywords": [`${fuelLabel} price in ${city}`, `today ${fuelLabel.toLowerCase()} rate ${city}`, `${city} ${fuelLabel.toLowerCase()} price`, "fuel price", "daily price update"],
                        "license": "https://creativecommons.org/licenses/by/4.0/",
                        "spatialCoverage": {"@type": "Place", "name": `${city}, ${state}`},
                        "temporalCoverage": temporal,
                        "creator": org,
                        "provider": org
                    },
                    {
                        "@type": "FAQPage",
                        "mainEntity": Array.from(document.querySelectorAll('.showH > details')).map(d => ({
                            "@type": "Question",
                            "name": d.querySelector('summary').textContent,
                            "acceptedAnswer": {"@type": "Answer", "text": d.querySelector('.aC p').innerHTML}
                        }))
                    }
                ]
            };
            
            const script = document.createElement('script');
            script.type = 'application/ld+json';
            script.id = 'frisqoo-custom-schema';
            script.text = JSON.stringify(schema);
            document.head.appendChild(script);
        }, {timeout: 2000});
    };
    
    // ===== FAQ COMPARISON =====
    const generateComparisonFAQ = statePriceData => {
        if (!statePriceData || statePriceData.length < 2 || !capitalCity) {
            const el = document.getElementById('faqComparisonDetails');
            if (el) el.style.display = 'none';
            return;
        }
        
        let currentPrice = 'N/A', capitalPrice = 'N/A';
        let minPrice = {price: Infinity, cities: []};
        let maxPrice = {price: -Infinity, cities: []};
        
        for (let i = 1; i < statePriceData.length; i++) {
            const [cityName, priceVal] = statePriceData[i];
            const price = parseFloat(String(priceVal).replace(/[^0-9.-]/g, ''));
            
            if (cityName === city) currentPrice = priceVal;
            if (cityName === capitalCity) capitalPrice = priceVal;
            
            if (!isNaN(price)) {
                if (price < minPrice.price) {
                    minPrice = {price, cities: [cityName]};
                } else if (price === minPrice.price) {
                    minPrice.cities.push(cityName);
                }
                
                if (price > maxPrice.price) {
                    maxPrice = {price, cities: [cityName]};
                } else if (price === maxPrice.price) {
                    maxPrice.cities.push(cityName);
                }
            }
        }
        
        const comparison = (city === capitalCity) 
            ? `As the state capital, this price serves as a key benchmark for other cities in ${state}.`
            : `For comparison, the price in the state capital <strong>${capitalCity}</strong> is <strong>${capitalPrice}</strong>.`;
        
        updateElement('faqComparisonAnswer', 
            `In <strong>${city}</strong>, today's ${fuelLabel.toLowerCase()} price is <strong>${currentPrice}</strong>. ${comparison}<br><br>Currently, the cheapest ${fuelLabel.toLowerCase()} in ${state} is <strong>₹${minPrice.price.toFixed(2)}</strong> in ${minPrice.cities.join(' and ')}, while the most expensive is <strong>₹${maxPrice.price.toFixed(2)}</strong> in ${maxPrice.cities.join(' and ')}.<br><br>For a full city-by-city breakdown, <strong><a href="https://www.frisqoo.com/p/${fuelType}-price-in-${stateSlug}.html">view the complete ${state} ${fuelLabel} price list</a></strong>.`,
            false
        );
    };
    
    // ===== MAIN INIT =====
    const init = async () => {
        try {
            const [states, cities, priceData, tableData] = await Promise.all([
                fetchJSON(`https://cdn.frisqoo.com/utilities/${fuelType}/states.json`),
                fetchJSON(`https://cdn.frisqoo.com/utilities/${fuelType}/${stateSlug}.json`),
                fetchJSON(`https://cdn.frisqoo.com/${fuelType}/${stateSlug}.json`),
                fetchJSON(`https://cdn.frisqoo.com/${fuelType}/${stateSlug}/${citySlug}.json`)
            ]);
            
            await new Promise(resolve => {
                const stateSelect = document.getElementById('stateSelect');
                const citySelect = document.getElementById('citySelect');
                
                stateSelect.innerHTML = states.map(s => 
                    `<option value="${s.name}" data-url="${s.url}"${s.name === state ? ' selected' : ''}>${s.name}</option>`
                ).join('');
                
                citySelect.innerHTML = cities.map(c => 
                    `<option value="${c.name}" data-url="${c.url}"${c.name === city ? ' selected' : ''}>${c.name}</option>`
                ).join('');
                
                stateSelect.addEventListener('change', function() { goToURL(this); }, {passive: true});
                citySelect.addEventListener('change', function() { goToURL(this); }, {passive: true});
                
                setTimeout(resolve, 0);
            });
            
            await new Promise(resolve => {
                const cityData = priceData.find((r, i) => i > 0 && r[0].trim().toLowerCase() === city.trim().toLowerCase());
                if (cityData) {
                    const [, price, changeStr] = cityData;
                    const change = parseFloat(changeStr.replace(/[^0-9.-]/g, ''));
                    const {arrow, color} = getPriceIndicator(change);
                    
                    updateElement('paraPrice', price);
                    updateElement('petrolPriceValue', 
                        `<span style="font-size:19px;font-weight:bold">${price}</span> <span style="font-size:14px">/ltr</span><span style="font-size:14px">(₹${Math.abs(change).toFixed(2)} <span style="font-weight:bold;color:${color}">${arrow}</span>)</span>`,
                        false
                    );
                    
                    updateElement('petrolPriceFAQ', 
                        `The ${fuelLabel.toLowerCase()} price in ${city} is <strong>${price}</strong> per litre. Prices are updated daily at 6:00 AM IST.`,
                        false
                    );
                    
                    const trend = change > 0 
                        ? `has <strong style="color:red;">increased</strong> by ₹${Math.abs(change).toFixed(2)} since yesterday.`
                        : change < 0 
                            ? `has <strong style="color:green;">decreased</strong> by ₹${Math.abs(change).toFixed(2)} since yesterday.`
                            : `has <strong style="color:black;">remained the same</strong> compared to yesterday.`;
                    
                    updateElement('faqTrendAnswer', 
                        `Compared to yesterday, the ${fuelLabel.toLowerCase()} price in <strong>${city}</strong> ${trend}`,
                        false
                    );
                }
                setTimeout(resolve, 0);
            });
            
            await new Promise(resolve => {
                const tbody = document.querySelector('#dataTable tbody');
                if (tableData?.length > 1) {
                    const fragment = document.createDocumentFragment();
                    const template = document.createElement('template');
                    
                    template.innerHTML = tableData.slice(1).map(row => {
                        const num = parseFloat(String(row[2]).replace(/[^0-9.-]/g, ''));
                        const {arrow, color} = getPriceIndicator(num);
                        return `<tr><td>${formatDate(row[0])}</td><td>${row[1]}</td><td>${row[2]} <span style="font-weight:bold;color:${color}">${arrow}</span></td></tr>`;
                    }).join('');
                    
                    fragment.appendChild(template.content);
                    tbody.innerHTML = '';
                    tbody.appendChild(fragment);
                    
                    updateElement('faqYesterdayAnswer', 
                        `Yesterday, on <strong>${formatDate(tableData[1][0])}</strong>, the ${fuelLabel.toLowerCase()} price in <strong>${city}</strong> was <strong>${tableData[1][1]}</strong> per litre.`,
                        false
                    );
                } else {
                    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center!important;padding:20px;">Price history is currently unavailable.</td></tr>';
                }
                setTimeout(resolve, 0);
            });
            
            generateComparisonFAQ(priceData);
            injectSchema(tableData);
            
        } catch (e) {
            console.error('Init error:', e);
        }
        
        requestIdleCallback(() => {
            const title = document.querySelector(".pTtl > span");
            if (title) {
                const base = title.innerText.split(' - Today')[0];
                title.innerHTML = `${base} - Today <span style="font-size:18px">(${currentDate})</span>`;
            }
            
            fetchJSON('https://www.frisqoo.com/feeds/posts/summary/-/Fuel?alt=json&max-results=5')
                .then(data => {
                    const posts = (data.feed?.entry || []).map((e, i) => 
                        `<p style="display:flex;align-items:center;margin:0"><span>${i + 1}. </span><a href="${e.link.find(l => l.rel === "alternate").href}" target="_blank" style="margin-left:5px">${e.title.$t}</a></p>`
                    ).join('');
                    const el = document.getElementById("related-posts");
                    if (el) el.innerHTML = posts;
                }).catch(() => {});
        }, {timeout: 3000});
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('input[type=radio][name="fuelType"]').forEach(r => {
            r.addEventListener('change', () => {
                const a = r.nextElementSibling?.querySelector('a');
                if (a) a.click();
            }, {passive: true});
        });
    });
})();
