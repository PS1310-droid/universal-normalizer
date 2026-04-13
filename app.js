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

    // --- Schema Flow Canvas Animation ---
    const canvas = document.getElementById('schema-flow-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        const GREEN = [0, 229, 153];
        const DIM_GREEN = [0, 140, 90];

        function resizeCanvas() {
            canvas.width = canvas.parentElement.offsetWidth;
            canvas.height = canvas.parentElement.offsetHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', () => {
            resizeCanvas();
            initScene();
        });

        // Scene data
        let chaosNodes = [];
        let laneLines = [];
        let flowParticles = [];
        const LANE_COUNT = 8;
        const CHAOS_NODE_COUNT = 40;

        // Helper: calculate lane Y positions centered in the canvas
        function getLaneY(h, i) {
            const topPad = h * 0.05;
            const bottomPad = h * 0.05;
            const usable = h - topPad - bottomPad;
            return topPad + (usable / (LANE_COUNT - 1)) * i;
        }

        function initScene() {
            chaosNodes = [];
            laneLines = [];
            flowParticles = [];

            const w = canvas.width;
            const h = canvas.height;
            const funnelX = w * 0.48;

            // Generate chaotic nodes on the left 40% of the screen
            for (let i = 0; i < CHAOS_NODE_COUNT; i++) {
                chaosNodes.push({
                    x: 20 + Math.random() * (funnelX - 60),
                    y: 20 + Math.random() * (h - 40),
                    size: 2 + Math.random() * 3,
                    connections: [],
                    pulsePhase: Math.random() * Math.PI * 2
                });
            }

            // Connect nearby chaos nodes with messy lines (max 3 connections per node)
            chaosNodes.forEach((node, i) => {
                let connCount = 0;
                chaosNodes.forEach((other, j) => {
                    if (i === j || connCount >= 3) return;
                    const dist = Math.hypot(node.x - other.x, node.y - other.y);
                    if (dist < 160 && Math.random() > 0.4) {
                        node.connections.push(j);
                        connCount++;
                    }
                });
            });

            // Generate clean lane lines on the right side
            for (let i = 0; i < LANE_COUNT; i++) {
                const laneY = getLaneY(h, i);
                laneLines.push({
                    y: laneY,
                    startX: funnelX + 30,
                    endX: w - 10
                });
            }

            // Create flow particles that travel along funnel paths
            for (let i = 0; i < 35; i++) {
                flowParticles.push(createFlowParticle(w, h, funnelX));
            }
        }

        function createFlowParticle(w, h, funnelX) {
            const laneIdx = Math.floor(Math.random() * LANE_COUNT);
            const laneY = getLaneY(h, laneIdx);
            // Start from a random chaos node
            const sourceNode = chaosNodes[Math.floor(Math.random() * chaosNodes.length)];
            return {
                startX: sourceNode ? sourceNode.x : Math.random() * funnelX * 0.6,
                startY: sourceNode ? sourceNode.y : Math.random() * h,
                endY: laneY,
                funnelX: funnelX,
                endX: w - 10,
                progress: Math.random(),
                speed: 0.002 + Math.random() * 0.004,
                opacity: 0.5 + Math.random() * 0.5,
                size: 2 + Math.random() * 2
            };
        }

        initScene();

        let time = 0;
        function drawFrame() {
            time += 0.016;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const w = canvas.width;
            const h = canvas.height;
            const funnelX = w * 0.48;

            // ===== LEFT SIDE: Chaotic Network =====
            // Draw messy connection lines
            chaosNodes.forEach((node) => {
                node.connections.forEach(j => {
                    const other = chaosNodes[j];
                    ctx.beginPath();
                    // Curved messy lines
                    const midX = (node.x + other.x) / 2 + (Math.random() - 0.5) * 8;
                    const midY = (node.y + other.y) / 2 + (Math.random() - 0.5) * 8;
                    ctx.moveTo(node.x, node.y);
                    ctx.quadraticCurveTo(midX, midY, other.x, other.y);
                    ctx.strokeStyle = `rgba(${DIM_GREEN.join(',')}, 0.12)`;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                });
            });

            // Draw chaos nodes with subtle pulse
            chaosNodes.forEach(node => {
                const pulse = 0.5 + Math.sin(time * 1.5 + node.pulsePhase) * 0.3;
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${GREEN.join(',')}, ${pulse * 0.5})`;
                ctx.fill();
                // Glow ring
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.size + 3, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(${GREEN.join(',')}, ${pulse * 0.1})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            });

            // ===== CENTER: Convergence Funnel =====
            // Draw a subtle vertical funnel glow
            const funnelGrad = ctx.createLinearGradient(funnelX - 30, 0, funnelX + 30, 0);
            funnelGrad.addColorStop(0, 'rgba(0, 229, 153, 0)');
            funnelGrad.addColorStop(0.5, `rgba(0, 229, 153, ${0.06 + Math.sin(time * 0.8) * 0.03})`);
            funnelGrad.addColorStop(1, 'rgba(0, 229, 153, 0)');
            ctx.fillStyle = funnelGrad;
            ctx.fillRect(funnelX - 30, 0, 60, h);

            // Vertical dashed line at funnel center
            ctx.setLineDash([8, 12]);
            ctx.beginPath();
            ctx.moveTo(funnelX, 20);
            ctx.lineTo(funnelX, h - 20);
            ctx.strokeStyle = `rgba(${GREEN.join(',')}, 0.15)`;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.setLineDash([]);

            // ===== RIGHT SIDE: Clean Organized Lanes =====
            laneLines.forEach((lane, i) => {
                // Lane line — solid, visible
                ctx.beginPath();
                ctx.moveTo(lane.startX, lane.y);
                ctx.lineTo(lane.endX, lane.y);
                ctx.strokeStyle = `rgba(${GREEN.join(',')}, 0.35)`;
                ctx.lineWidth = 1;
                ctx.stroke();

                // Brighter leading segment near funnel
                const leadGrad = ctx.createLinearGradient(lane.startX, 0, lane.startX + 80, 0);
                leadGrad.addColorStop(0, `rgba(${GREEN.join(',')}, 0)`);
                leadGrad.addColorStop(1, `rgba(${GREEN.join(',')}, 0.5)`);
                ctx.beginPath();
                ctx.moveTo(lane.startX, lane.y);
                ctx.lineTo(lane.startX + 80, lane.y);
                ctx.strokeStyle = leadGrad;
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Terminal node dots along the lane
                for (let n = 0; n < 5; n++) {
                    const nx = lane.startX + 60 + n * ((lane.endX - lane.startX - 80) / 4);
                    const dotPulse = 0.5 + Math.sin(time * 1.2 + i + n * 0.8) * 0.3;
                    ctx.beginPath();
                    ctx.arc(nx, lane.y, 3, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${GREEN.join(',')}, ${dotPulse})`;
                    ctx.fill();
                }

                // Lane label brackets
                ctx.beginPath();
                ctx.moveTo(lane.endX - 6, lane.y - 8);
                ctx.lineTo(lane.endX, lane.y - 8);
                ctx.lineTo(lane.endX, lane.y + 8);
                ctx.lineTo(lane.endX - 6, lane.y + 8);
                ctx.strokeStyle = `rgba(${GREEN.join(',')}, 0.3)`;
                ctx.lineWidth = 1.2;
                ctx.stroke();
            });

            // ===== FLOW PARTICLES: Travel from chaos → lanes =====
            flowParticles.forEach(p => {
                p.progress += p.speed;
                if (p.progress >= 1) {
                    p.progress = 0;
                    // Pick new source
                    const src = chaosNodes[Math.floor(Math.random() * chaosNodes.length)];
                    if (src) { p.startX = src.x; p.startY = src.y; }
                    const laneIdx = Math.floor(Math.random() * LANE_COUNT);
                    p.endY = getLaneY(h, laneIdx);
                }

                const t = p.progress;
                // Bezier curve from chaos node → funnel → lane
                const cp1x = p.funnelX - 60;
                const cp1y = p.startY;
                const cp2x = p.funnelX + 60;
                const cp2y = p.endY;
                // Cubic bezier
                const mt = 1 - t;
                const px = mt * mt * mt * p.startX + 3 * mt * mt * t * cp1x + 3 * mt * t * t * cp2x + t * t * t * p.endX;
                const py = mt * mt * mt * p.startY + 3 * mt * mt * t * cp1y + 3 * mt * t * t * cp2y + t * t * t * p.endY;

                // Draw particle
                const brightness = 0.3 + t * 0.7; // gets brighter as it organizes
                ctx.beginPath();
                ctx.arc(px, py, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${GREEN.join(',')}, ${p.opacity * brightness})`;
                ctx.fill();

                // Trail
                const prevT = Math.max(0, t - 0.04);
                const pmt = 1 - prevT;
                const prevX = pmt * pmt * pmt * p.startX + 3 * pmt * pmt * prevT * cp1x + 3 * pmt * prevT * prevT * cp2x + prevT * prevT * prevT * p.endX;
                const prevY = pmt * pmt * pmt * p.startY + 3 * pmt * pmt * prevT * cp1y + 3 * pmt * prevT * prevT * cp2y + prevT * prevT * prevT * p.endY;

                ctx.beginPath();
                ctx.moveTo(prevX, prevY);
                ctx.lineTo(px, py);
                ctx.strokeStyle = `rgba(${GREEN.join(',')}, ${p.opacity * brightness * 0.5})`;
                ctx.lineWidth = p.size * 0.8;
                ctx.stroke();
            });

            requestAnimationFrame(drawFrame);
        }
        drawFrame();
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

    // --- Toggle Custom Keys Field ---
    const templateSelect = document.getElementById('pg-template');
    const customKeysField = document.getElementById('pg-custom-keys-field');

    if (templateSelect && customKeysField) {
        templateSelect.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                customKeysField.style.display = 'block';
            } else {
                customKeysField.style.display = 'none';
            }
        });
    }

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
                // 1. Generate or retrieve the Anonymous LocalStorage ID
                let clientId = localStorage.getItem('schemasync_client_id');
                if (!clientId) {
                    clientId = 'client_' + Math.random().toString(36).substr(2, 9);
                    localStorage.setItem('schemasync_client_id', clientId);
                }

                // 2. Build the Envelope (Headers)
                const headers = {
                    'Content-Type': 'application/json',
                    'x-client-id': clientId  // <--- Sends the nametag to Python
                };

                // 3. If they typed an AI key, attach it with the NEW header name!
                if (apiKey) {
                    headers['x-llm-key'] = apiKey; // <--- Changed from X-API-Key
                }

                // 4. Build the payload dynamically (Template vs Custom Array)
                let requestBody = {
                    messy_data: payload,
                    is_playground: true
                };

                if (template === 'custom') {
                    // Turn "First, Last" into ["First", "Last"]
                    const rawKeys = document.getElementById('pg-custom-keys').value || "";
                    const keysArray = rawKeys.split(',').map(k => k.trim()).filter(k => k);
                    requestBody.master_keys = keysArray;
                } else {
                    requestBody.template_name = template;
                }

                // Make sure your FastAPI server is running on localhost:8000
                const response = await fetch('http://127.0.0.1:8000/normalize/auto', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(requestBody)
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