const API = 'http://localhost:5000';

const authContainer =
document.getElementById('authContainer');

const dashboard =
document.getElementById('dashboard');

/* =========================
   CHECK LOGIN
========================= */

function checkLogin(){

    const token =
    localStorage.getItem('token');

    const user =
    JSON.parse(localStorage.getItem('user'));

    if(token){

        authContainer.classList.add('hidden');

        dashboard.classList.remove('hidden');

        document.getElementById(
            'userName'
        ).innerText =
        user.username;

        document.getElementById(
            'userRole'
        ).innerText =
        user.role;

        if(user.role === 'admin'){

            document.getElementById(
                'adminPanel'
            ).classList.remove('hidden');

            loadAdminTasks();

        }else{

            document.getElementById(
                'clientPanel'
            ).classList.remove('hidden');

            loadTasks();
        }

    }else{

        authContainer.classList.remove('hidden');

        dashboard.classList.add('hidden');
    }
}

/* =========================
   REGISTER
========================= */

async function register(){

    const username =
    document.getElementById('username').value;

    const email =
    document.getElementById('email').value;

    const password =
    document.getElementById('password').value;

    try{

        const response = await fetch(

            `${API}/register`,

            {

                method:'POST',

                headers:{
                    'Content-Type':'application/json'
                },

                body:JSON.stringify({

                    username,
                    email,
                    password
                })
            }
        );

        const data =
        await response.json();

        document.getElementById(
            'authMessage'
        ).innerText =
        'Registration successful';

    }catch(error){

        console.error(error);
    }
}

/* =========================
   LOGIN
========================= */

async function login(){

    const email =
    document.getElementById('email').value;

    const password =
    document.getElementById('password').value;

    try{

        const response = await fetch(

            `${API}/login`,

            {

                method:'POST',

                headers:{
                    'Content-Type':'application/json'
                },

                body:JSON.stringify({

                    email,
                    password
                })
            }
        );

        const data =
        await response.json();

        if(data.token){

            localStorage.setItem(
                'token',
                data.token
            );

            localStorage.setItem(
                'user',
                JSON.stringify(data.user)
            );

            checkLogin();

        }else{

            document.getElementById(
                'authMessage'
            ).innerText =
            data.error;
        }

    }catch(error){

        console.error(error);
    }
}

/* =========================
   ADMIN TASKS
========================= */

async function createTask(){

    const title =
    document.getElementById('taskInput').value;
const username =
document.getElementById('assignedTo').value;
    const token =
    localStorage.getItem('token');

    try{

        await fetch(

            `${API}/tasks`,

            {

                method:'POST',

                headers:{

                    'Content-Type':'application/json',

                    Authorization:token
                },

                body:JSON.stringify({

    title,

    username
})
            }
        );

        loadAdminTasks();

    }catch(error){

        console.error(error);
    }
}

async function loadAdminTasks(){

    const token =
    localStorage.getItem('token');

    try{

        const response = await fetch(

            `${API}/admin/tasks`,

            {

                headers:{
                    Authorization:token
                }
            }
        );

        const tasks =
        await response.json();

        const list =
        document.getElementById(
            'adminTaskList'
        );

        list.innerHTML = '';

        tasks.forEach(task => {

            const li =
            document.createElement('li');

            li.innerHTML = `

                <div>

                    <strong>${task.title}</strong>

                    <p>
                        Assigned To:
                        ${task.username}
                    </p>

                    <p>
                        Status:
                        ${task.status}
                    </p>

                </div>

                <button
                    class="delete-btn"
                    onclick="deleteTask(${task.id})"
                >
                    Delete
                </button>

            `;

            list.appendChild(li);
        });

    }catch(error){

        console.error(error);
    }
}

/* =========================
   CLIENT TASKS
========================= */

async function loadTasks(){

    const token =
    localStorage.getItem('token');

    try{

        const response = await fetch(

            `${API}/tasks`,

            {

                headers:{
                    Authorization:token
                }
            }
        );

        const tasks =
        await response.json();

        const taskList =
        document.getElementById(
            'taskList'
        );

        taskList.innerHTML = '';

        tasks.forEach(task => {

            const li =
            document.createElement('li');

            li.innerHTML = `

                <div>

                    <strong>${task.title}</strong>

                    <p>
                        Status:
                        ${task.status}
                    </p>

                </div>

                <button
                    class="delete-btn"
                    onclick="completeTask(${task.id})"
                >
                    Complete
                </button>

            `;

            taskList.appendChild(li);
        });

    }catch(error){

        console.error(error);
    }
}

/* =========================
   COMPLETE TASK
========================= */

async function completeTask(id){

    const token =
    localStorage.getItem('token');

    try{

        await fetch(

            `${API}/tasks/${id}/status`,

            {

                method:'PATCH',

                headers:{

                    'Content-Type':'application/json',

                    Authorization:token
                },

                body:JSON.stringify({

                    status:'completed'
                })
            }
        );

        loadTasks();

    }catch(error){

        console.error(error);
    }
}

/* =========================
   DELETE TASK
========================= */

async function deleteTask(id){

    const token =
    localStorage.getItem('token');

    try{

        await fetch(

            `${API}/tasks/${id}`,

            {

                method:'DELETE',

                headers:{
                    Authorization:token
                }
            }
        );

        loadAdminTasks();

    }catch(error){

        console.error(error);
    }
}

/* =========================
   LOGOUT
========================= */

function logout(){

    localStorage.removeItem('token');

    localStorage.removeItem('user');

    location.reload();
}

/* =========================
   START
========================= */

checkLogin();