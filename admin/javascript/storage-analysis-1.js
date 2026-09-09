const isAdmin = true; 

        function loadSidebar() {
            const sidebarMenu = document.getElementById('sidebar-menu');
            let menuHTML = `
                <li><a href="analytics.html"><span class="material-icons">analytics</span> Analytics</a></li>
                <li><a href="billing.html"><span class="material-icons">receipt_long</span> Billing</a></li>
                <li><a href="manage-users.html"><span class="material-icons">group</span> Manage Users</a></li>
                <li><a href="storage-analysis.html" class="active"><span class="material-icons">storage</span> Storage Analysis</a></li>
                <li><a href="users.html"><span class="material-icons">person</span> Users</a></li>
            `;
            if (isAdmin === true) {
                menuHTML += `<li class="admin-menu"><a href="admin-dashboard.html"><span class="material-icons">admin_panel_settings</span> ADMIN PANEL</a></li>`;
            }
            sidebarMenu.innerHTML = menuHTML;
        }

        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        document.getElementById('hamburger-btn').addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });

        // THEME TOGGLE
        const themeToggle = document.getElementById('theme-toggle');
        const themeIcon = document.getElementById('theme-icon');
        const body = document.body;
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            body.classList.add('dark-mode');
            themeIcon.textContent = 'light_mode';
        }
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            if (body.classList.contains('dark-mode')) {
                localStorage.setItem('theme', 'dark');
                themeIcon.textContent = 'light_mode';
            } else {
                localStorage.setItem('theme', 'light');
                themeIcon.textContent = 'dark_mode';
            }
        });

        document.addEventListener('DOMContentLoaded', loadSidebar);
