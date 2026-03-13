document.addEventListener('DOMContentLoaded', async () => {
    // --- Auth Check ---
    if (localStorage.getItem('xai_logged_in') !== 'true') {
        window.location.href = '/';
        return;
    }

    const userNameEl = document.getElementById('userName');
    const userHandleEl = document.getElementById('userHandle');
    const userAvatarEl = document.getElementById('userAvatar');
    const repoGrid = document.getElementById('repoGrid');
    const logoutBtn = document.getElementById('logoutBtn');

    const statusBox = document.getElementById('statusMessage');
    const statusText = document.getElementById('statusText');
    const statusIcon = statusBox.querySelector('.status-icon');

    // --- Logout Handling ---
    logoutBtn.addEventListener('click', async () => {
        localStorage.removeItem('xai_logged_in');
        
        // Call backend to clear HTTPOnly cookie
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
    });

    try {
        // --- Intro Dashboard Animations ---
        gsap.fromTo(".dashboard-header, h1, .subtitle", 
            { y: 20, opacity: 0 }, 
            { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "power2.out" }
        );

        // --- Fetch User Profile ---
        const userRes = await fetch('/api/user');
        if (!userRes.ok) {
            throw new Error("Session expired");
        }
        const user = await userRes.json();
        
        userNameEl.textContent = user.name || user.login;
        userHandleEl.textContent = `@${user.login}`;
        
        // Re-create the avatar element as an img
        const img = document.createElement('img');
        img.src = user.avatar_url;
        img.className = 'user-avatar';
        img.alt = 'User Avatar';
        userAvatarEl.replaceWith(img);

        // --- Fetch Repositories ---
        const reposRes = await fetch('/api/user/repos');
        if (!reposRes.ok) {
            throw new Error("Failed to load repositories");
        }
        const repos = await reposRes.json();
        
        repoGrid.innerHTML = ''; // Clear loader
        
        if (repos.length === 0) {
            repoGrid.innerHTML = '<p style="color: #a0a0b0; grid-column: 1/-1;">No repositories found on this GitHub account.</p>';
            return;
        }

        // Render Cards
        repos.forEach(repo => {
            const card = document.createElement('div');
            card.className = 'repo-card';

            const privacyBadge = repo.private ? 
                '<span class="repo-badge"><i data-feather="lock" style="width: 10px; height: 10px;"></i> Private</span>' : 
                '<span class="repo-badge"><i data-feather="globe" style="width: 10px; height: 10px;"></i> Public</span>';
            
            const connectBtnHtml = repo.is_connected
                ? `<div style="display: flex; gap: 8px;">
                     <button class="connect-btn" style="background: var(--success-color); color: white; border-color: transparent; cursor: default;" disabled>
                       <i data-feather="check" style="width: 14px; height: 14px;"></i> Connected
                     </button>
                     <button class="disconnect-btn" data-repo="${repo.full_name}" title="Disconnect Repository">
                       <i data-feather="trash-2" style="width: 14px; height: 14px;"></i>
                     </button>
                   </div>`
                : `<button class="connect-btn" data-repo="${repo.full_name}">
                     <i data-feather="zap" style="width: 14px; height: 14px;"></i> Connect AI
                   </button>`;

            card.innerHTML = `
                <div class="repo-header">
                    <div>
                        <h3 class="repo-name">${repo.name}</h3>
                        ${privacyBadge}
                    </div>
                </div>
                <p class="repo-desc">${repo.description || 'No description provided.'}</p>
                <div class="repo-footer">
                    <span class="repo-lang">
                        <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#a855f7; margin-right:4px;"></span>
                        ${repo.language || 'Code'}
                    </span>
                    ${connectBtnHtml}
                </div>
            `;
            repoGrid.appendChild(card);
        });
        feather.replace();

        // --- Animate Grid Entrance ---
        gsap.fromTo(".repo-card", 
            { y: 40, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: "power3.out" }
        );

        // --- Attach Connect Events ---
        document.querySelectorAll('.connect-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const repoFullName = e.currentTarget.getAttribute('data-repo');
                if (repoFullName) {
                    await connectRepo(repoFullName, e.currentTarget);
                }
            });
        });

        // --- Attach Disconnect Events ---
        document.querySelectorAll('.disconnect-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                // Use currentTarget to ensure we pass the button, not inner SVG
                const targetBtn = e.currentTarget; 
                const repoFullName = targetBtn.getAttribute('data-repo');
                const confirmed = await showDisconnectModal(repoFullName);
                if (confirmed) {
                    await disconnectRepo(repoFullName, targetBtn);
                }
            });
        });

    } catch (err) {
        console.error(err);
        localStorage.removeItem('xai_logged_in');
        window.location.href = '/?error=session_expired';
    }

    // --- Connect Logic ---
    async function connectRepo(repoFullName, btnElement) {
        const originalText = btnElement.innerHTML;
        btnElement.innerHTML = '<i data-feather="loader" class="spin"></i> Connecting...';
        btnElement.disabled = true;
        feather.replace();

        try {
            const res = await fetch('/api/register-repo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repo_full_name: repoFullName })
            });
            const data = await res.json();

            if (res.ok) {
                showStatus('success', `Successfully connected XAI Reviewer to ${repoFullName}!`);
                
                // Real-time UI replacement: Swap "Connect" for the "Connected + Disconnect" flex row
                const parentDiv = btnElement.parentElement;
                
                const connectedContainer = document.createElement('div');
                connectedContainer.style.display = 'flex';
                connectedContainer.style.gap = '8px';
                
                connectedContainer.innerHTML = `
                    <button class="connect-btn" style="background: var(--success-color); color: white; border-color: transparent; cursor: default;" disabled>
                        <i data-feather="check" style="width: 14px; height: 14px;"></i> Connected
                    </button>
                    <button class="disconnect-btn" data-repo="${repoFullName}" title="Disconnect Repository">
                        <i data-feather="trash-2" style="width: 14px; height: 14px;"></i>
                    </button>
                `;
                
                // Attach the disconnect listener to the newly injected trash button
                const newDisconnectBtn = connectedContainer.querySelector('.disconnect-btn');
                newDisconnectBtn.addEventListener('click', async (e) => {
                    const targetBtn = e.currentTarget;
                    const confirmed = await showDisconnectModal(repoFullName);
                    if (confirmed) {
                        await disconnectRepo(repoFullName, targetBtn);
                    }
                });

                parentDiv.replaceChild(connectedContainer, btnElement);
            } else {
                showStatus('error', data.detail || `Failed to connect ${repoFullName}`);
                btnElement.innerHTML = originalText;
                btnElement.disabled = false;
            }
        } catch (error) {
            console.error(error);
            showStatus('error', 'Network error while configuring webhook.');
            btnElement.innerHTML = originalText;
            btnElement.disabled = false;
        }
        feather.replace();
        
        // Hide status after 5 seconds to keep dashboard clean
        setTimeout(hideStatus, 5000);
    }
    
    // --- Custom Modal Logic ---
    function showDisconnectModal(repoFullName) {
        return new Promise((resolve) => {
            const modal = document.getElementById('disconnectModal');
            const confirmBtn = document.getElementById('modalConfirmBtn');
            const cancelBtn = document.getElementById('modalCancelBtn');
            
            // Set dynamic repo name
            document.getElementById('modalRepoName').textContent = repoFullName;
            
            // Show modal
            modal.classList.remove('hidden');
            // Trigger animation frame so CSS transition applies
            requestAnimationFrame(() => {
                modal.classList.add('active');
            });
            
            // Cleanup function to remove listeners
            const cleanup = () => {
                modal.classList.remove('active');
                setTimeout(() => modal.classList.add('hidden'), 300); // Wait for transition
                confirmBtn.removeEventListener('click', onConfirm);
                cancelBtn.removeEventListener('click', onCancel);
            };
            
            const onConfirm = () => { cleanup(); resolve(true); };
            const onCancel = () => { cleanup(); resolve(false); };
            
            confirmBtn.addEventListener('click', onConfirm);
            cancelBtn.addEventListener('click', onCancel);
        });
    }

    // --- Disconnect Logic ---
    async function disconnectRepo(repoFullName, btnElement) {
        // Ensure we explicitly have the button element
        const btn = btnElement.closest ? (btnElement.closest('.disconnect-btn') || btnElement) : btnElement;
        
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i data-feather="loader" class="spin" style="width: 14px; height: 14px;"></i>';
        btn.disabled = true;
        feather.replace();

        try {
            const res = await fetch('/api/unregister-repo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repo_full_name: repoFullName })
            });
            const data = await res.json();

            if (res.ok) {
                showStatus('success', `Successfully disconnected XAI Reviewer from ${repoFullName}!`);
                
                // Usually the parent is the flex div injected above
                const parentContainer = btn.parentElement;
                
                const newBtn = document.createElement('button');
                newBtn.className = 'connect-btn';
                newBtn.setAttribute('data-repo', repoFullName);
                newBtn.innerHTML = '<i data-feather="zap" style="width: 14px; height: 14px;"></i> Connect AI';
                
                newBtn.addEventListener('click', async (e) => {
                    await connectRepo(repoFullName, e.currentTarget);
                });

                // Replace the entire flex container (or just the button if it wasn't in a flex container)
                if (parentContainer && parentContainer.style.display === 'flex') {
                    parentContainer.replaceWith(newBtn);
                } else {
                    btn.replaceWith(newBtn);
                }
            } else {
                showStatus('error', data.detail || `Failed to disconnect ${repoFullName}`);
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        } catch (error) {
            console.error(error);
            showStatus('error', 'Network error while unregistering webhook.');
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
        feather.replace();
        
        setTimeout(hideStatus, 5000);
    }
    
    // --- Helpers ---
    function showStatus(type, message) {
        statusBox.className = `status-message ${type}`;
        statusText.textContent = message;
        
        if (type === 'success') {
            statusIcon.setAttribute('data-feather', 'check-circle');
            statusBox.style.background = 'rgba(16, 185, 129, 0.1)';
            statusBox.style.borderColor = 'rgba(16, 185, 129, 0.2)';
            statusBox.style.color = '#34d399';
        } else {
            statusIcon.setAttribute('data-feather', 'alert-circle');
            statusBox.style.background = 'rgba(239, 68, 68, 0.1)';
            statusBox.style.borderColor = 'rgba(239, 68, 68, 0.2)';
            statusBox.style.color = '#f87171';
        }
        feather.replace();
    }

    function hideStatus() {
        statusBox.classList.add('hidden');
    }
});
