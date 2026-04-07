document.addEventListener('DOMContentLoaded', () => {

    // --- Hero Text Cycler ---
    const headers = document.querySelectorAll('.hero-title');
    let currentIndex = 0;
    if (headers.length > 0) {
        setInterval(() => {
            headers[currentIndex].classList.remove('active');
            currentIndex = (currentIndex + 1) % headers.length;
            headers[currentIndex].classList.add('active');
        }, 3500);
    }

    // --- Precise Grid Intersection Background ---
    const bgContainer = document.getElementById('tech-map-bg');
    if (bgContainer) {
        const gridSize = 40;
        let dots = [];

        function buildGrid() {
            bgContainer.innerHTML = '';
            dots = [];

            const cols = Math.ceil(window.innerWidth / gridSize);
            const rows = Math.ceil(window.innerHeight / gridSize);

            for (let c = 0; c <= cols; c++) {
                for (let r = 0; r <= rows; r++) {
                    const density = (c / cols) * 0.4 + (1 - (r / rows)) * 0.2;

                    if (Math.random() < density || Math.random() < 0.05) {
                        const dot = document.createElement('div');
                        dot.classList.add('tech-dot');
                        dot.style.left = `${c * gridSize}px`;
                        dot.style.top = `${r * gridSize}px`;

                        if (Math.random() > 0.8) {
                            dot.classList.add('active');
                        }

                        bgContainer.appendChild(dot);
                        dots.push(dot);
                    }
                }
            }
        }

        buildGrid();
        window.addEventListener('resize', () => {
            clearTimeout(window.resizeTimer);
            window.resizeTimer = setTimeout(buildGrid, 200);
        });

        setInterval(() => {
            if (dots.length === 0) return;

            const activeDots = dots.filter(d => d.classList.contains('active'));
            activeDots.forEach(d => {
                if (Math.random() > 0.7) d.classList.remove('active');
            });

            for (let i = 0; i < 5; i++) {
                const randomDot = dots[Math.floor(Math.random() * dots.length)];
                if (randomDot) randomDot.classList.add('active');
            }
        }, 800);
    }

    // --- Pipeline Scroll Animation ---
    const pipelineSteps = document.querySelectorAll('.pipeline-step');
    if (pipelineSteps.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    pipelineSteps.forEach((step, idx) => {
                        setTimeout(() => {
                            step.classList.add('active');
                        }, idx * 300);
                    });
                    observer.disconnect();
                }
            });
        }, { threshold: 0.5 });
        observer.observe(document.querySelector('.pipeline-flow'));
    }

    // --- Code Tabs ---
    const codeTabs = document.querySelectorAll('.code-tab');
    codeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');

            // Remove active from all
            document.querySelectorAll('.code-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.code-tab-content').forEach(c => c.classList.remove('active'));

            // Add to selected
            tab.classList.add('active');
            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });

    // --- Playground Logic ---
    const pgTabs = document.querySelectorAll('.pg-tab');
    pgTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-pg-tab');

            // Remove active from all
            document.querySelectorAll('.pg-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.pg-tab-content').forEach(c => c.classList.remove('active'));

            // Add to selected
            tab.classList.add('active');
            document.getElementById(`pg-${tabId}`).classList.add('active');
        });
    });

    const submitBtn = document.getElementById('pg-submit');
    if (submitBtn) {
        submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const template = document.getElementById('pg-template').value;
            const apiKey = document.getElementById('pg-apikey').value.trim();
            const jsonText = document.getElementById('pg-json').value;

            const loading = document.getElementById('pg-loading');
            const errorDiv = document.getElementById('pg-error');

            const readyTab = document.getElementById('pg-ready');
            const flaggedTab = document.getElementById('pg-flagged');
            const auditTab = document.getElementById('pg-audit');

            // Reset UI
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';

            let payload;
            try {
                payload = JSON.parse(jsonText);
            } catch (e) {
                errorDiv.textContent = "Invalid JSON input.";
                errorDiv.style.display = 'block';
                return;
            }

            loading.style.display = 'flex';

            try {
                // Call real backend endpoint
                const headers = {
                    'Content-Type': 'application/json'
                };
                if (apiKey) {
                    headers['X-API-Key'] = apiKey;
                }

                // Make sure your FastAPI server is running on localhost:8000
                const response = await fetch('http://127.0.0.1:8000/normalize/auto', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        template_name: template,
                        messy_data: payload,
                        is_playground: true // Tells the backend to use the strict 300-char limit
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.detail || "Error from server");
                }

                // Render output
                readyTab.innerHTML = `<pre><code>${JSON.stringify(data.ready_to_use, null, 2)}</code></pre>`;

                if (Object.keys(data.flagged_for_review).length > 0) {
                    flaggedTab.innerHTML = `<pre><code>${JSON.stringify(data.flagged_for_review, null, 2)}</code></pre>`;
                    // Switch to flagged tab to show user
                    document.querySelector('[data-pg-tab="flagged"]').click();
                } else {
                    flaggedTab.innerHTML = `<div class="pg-placeholder"><p>Nothing flagged! 100% mapped.</p></div>`;
                    document.querySelector('[data-pg-tab="ready"]').click();
                }

                if (data.audit_log && data.audit_log.length > 0) {
                    auditTab.innerHTML = data.audit_log.map(log =>
                        `<div class="audit-entry ${log.includes('flagged') ? 'audit-flag' : 'audit-info'}">
                            ${log}
                         </div>`
                    ).join('');
                }

            } catch (err) {
                errorDiv.textContent = err.message || "Failed to connect to API.";
                errorDiv.style.display = 'block';
            } finally {
                loading.style.display = 'none';
            }
        });
    }

    // --- Templates Keys Toggle ---
    const templateDataCache = {
        "shopify_customer": {
            "fields": ["customer_id", "customer_email", "customer_first_name", "customer_last_name", "customer_phone", "customer_created_at", "customer_updated_at", "customer_state", "customer_note", "customer_verified_email", "customer_tax_exempt", "customer_orders_count", "customer_total_spent", "customer_tags", "customer_default_address_company", "customer_default_address_address1", "customer_default_address_address2", "customer_default_address_city", "customer_default_address_province", "customer_default_address_country", "customer_default_address_zip", "customer_accepts_marketing", "customer_marketing_opt_in_level", "customer_currency"]
        },
        "salesforce_lead": {
            "fields": ["Id", "FirstName", "LastName", "Name", "Email", "Phone", "MobilePhone", "Company", "Title", "LeadSource", "Status", "Industry", "Rating", "AnnualRevenue", "NumberOfEmployees", "Website", "Street", "City", "State", "PostalCode", "Country", "Description", "CreatedDate", "LastModifiedDate", "IsConverted", "ConvertedDate", "ConvertedOpportunityId"]
        },
        "mailchimp_member": {
            "fields": ["email_address", "email_type", "status", "merge_fields_FNAME", "merge_fields_LNAME", "merge_fields_PHONE", "merge_fields_COMPANY", "timestamp_signup", "vip", "language", "location_country_code", "tags", "last_changed"]
        },
        "hubspot_contact": {
            "fields": ["hs_object_id", "firstname", "lastname", "email", "phone", "mobilephone", "company", "website", "jobtitle", "lifecyclestage", "hs_lead_status", "hubspot_owner_id", "createdate", "lastmodifieddate", "hs_analytics_source", "hs_analytics_source_data_1", "industry", "numemployees", "annualrevenue", "city", "state", "country", "zip"]
        }
    };

    const viewKeysBtns = document.querySelectorAll('.view-keys-btn');
    viewKeysBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = btn.closest('.t-card');
            if (!card) return;
            const container = card.querySelector('.t-keys-container');
            const templateName = card.getAttribute('data-template');
            const isCurrentlyExpanded = container.classList.contains('expanded');

            if (isCurrentlyExpanded) {
                container.classList.remove('expanded');
                btn.textContent = 'View keys';
            } else {
                const fields = templateDataCache[templateName]?.fields || [];
                container.innerHTML = fields.map(f => `<span class="key-badge">${f}</span>`).join('');
                container.classList.add('expanded');
                btn.textContent = 'Hide keys';
            }
        });
    });

    // --- FAQ Accordion ---
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            // Check if this item is already active
            const isActive = item.classList.contains('active');

            // Close all items
            faqItems.forEach(faq => faq.classList.remove('active'));

            // If it wasn't active, open it
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });

});