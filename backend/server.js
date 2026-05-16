const express = require('express');

const cors = require('cors');

const { Pool } = require('pg');

const bcrypt = require('bcrypt');

const jwt = require('jsonwebtoken');

require('dotenv').config();

const app = express();

/* =========================
   MIDDLEWARES
========================= */

app.use(cors());

app.use(express.json());

/* =========================
   DATABASE
========================= */

const pool = new Pool({

    user: process.env.DB_USER,

    host: process.env.DB_HOST,

    database: process.env.DB_NAME,

    password: process.env.DB_PASSWORD,

    port: process.env.DB_PORT,
});

/* =========================
   AUTH MIDDLEWARE
========================= */

async function auth(req, res, next){

    const token = req.header('Authorization');

    if(!token){

        return res.status(401).json({

            error:'Access denied'
        });
    }

    try{

        const verified = jwt.verify(

            token,

            process.env.JWT_SECRET
        );

        const userResult = await pool.query(

            'SELECT * FROM users WHERE id = $1',

            [verified.id]
        );

        req.user = userResult.rows[0];

        next();

    }catch(error){

        res.status(400).json({

            error:'Invalid token'
        });
    }
}

/* =========================
   ADMIN MIDDLEWARE
========================= */

function adminOnly(req, res, next){

    if(req.user.role !== 'admin'){

        return res.status(403).json({

            error:'Admins only'
        });
    }

    next();
}

/* =========================
   TEST
========================= */

app.get('/', (req, res) => {

    res.send('Smart Task Platform API Running');
});

/* =========================
   AUTH ROUTES
========================= */

/* REGISTER */

app.post('/register', async (req, res) => {

    try {

        const {

            username,
            email,
            password

        } = req.body;

        const existingUser = await pool.query(

            'SELECT * FROM users WHERE email = $1',

            [email]
        );

        if(existingUser.rows.length > 0){

            return res.status(400).json({

                error:'Email already exists'
            });
        }

        const hashedPassword = await bcrypt.hash(

            password,

            10
        );

        const result = await pool.query(

            `

            INSERT INTO users
            (username,email,password)

            VALUES ($1,$2,$3)

            RETURNING id,username,email,role

            `,

            [

                username,
                email,
                hashedPassword
            ]
        );

        res.json(result.rows[0]);

    } catch (error) {

        console.error(error);

        res.status(500).json({

            error:'Registration failed'
        });
    }
});

/* LOGIN */

app.post('/login', async (req, res) => {

    try {

        const {

            email,
            password

        } = req.body;

        const result = await pool.query(

            'SELECT * FROM users WHERE email = $1',

            [email]
        );

        if(result.rows.length === 0){

            return res.status(401).json({

                error:'Invalid email'
            });
        }

        const user = result.rows[0];

        const validPassword = await bcrypt.compare(

            password,

            user.password
        );

        if(!validPassword){

            return res.status(401).json({

                error:'Invalid password'
            });
        }

        const token = jwt.sign(

            {

                id:user.id
            },

            process.env.JWT_SECRET,

            {

                expiresIn:'1d'
            }
        );

        res.json({

            token,

            user:{

                id:user.id,
                username:user.username,
                email:user.email,
                role:user.role
            }
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            error:'Login failed'
        });
    }
});

/* =========================
   ADMIN ROUTES
========================= */

/* CREATE TASK */

app.post(

    '/tasks',

    auth,

    adminOnly,

    async (req, res) => {

        try {

            const {

                title,
                username

            } = req.body;

            const userResult = await pool.query(

                'SELECT * FROM users WHERE username = $1',

                [username]
            );

            if(userResult.rows.length === 0){

                return res.status(404).json({

                    error:'User not found'
                });
            }

            const assignedUser = userResult.rows[0];

            const result = await pool.query(

                `

                INSERT INTO tasks
                (
                    title,
                    assigned_to,
                    created_by
                )

                VALUES ($1,$2,$3)

                RETURNING *

                `,

                [

                    title,

                    assignedUser.id,

                    req.user.id
                ]
            );

            res.json(result.rows[0]);

        } catch (error) {

            console.error(error);

            res.status(500).json({

                error:'Failed to create task'
            });
        }
    }
);

/* DELETE TASK */

app.delete(

    '/tasks/:id',

    auth,

    adminOnly,

    async (req, res) => {

        try {

            const { id } = req.params;

            await pool.query(

                'DELETE FROM tasks WHERE id = $1',

                [id]
            );

            res.json({

                message:'Task deleted'
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                error:'Failed to delete task'
            });
        }
    }
);

/* VIEW ALL TASKS */

app.get(

    '/admin/tasks',

    auth,

    adminOnly,

    async (req, res) => {

        try {

            const result = await pool.query(

                `

                SELECT
                    tasks.*,
                    users.username

                FROM tasks

                JOIN users

                ON tasks.assigned_to = users.id

                ORDER BY tasks.id DESC

                `
            );

            res.json(result.rows);

        } catch (error) {

            console.error(error);

            res.status(500).json({

                error:'Failed to fetch tasks'
            });
        }
    }
);

/* =========================
   USER ROUTES
========================= */

/* GET MY TASKS */

app.get('/tasks', auth, async (req, res) => {

    try {

        const result = await pool.query(

            `

            SELECT *

            FROM tasks

            WHERE assigned_to = $1

            ORDER BY id DESC

            `,

            [req.user.id]
        );

        res.json(result.rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({

            error:'Failed to fetch tasks'
        });
    }
});

/* UPDATE STATUS */

app.patch(

    '/tasks/:id/status',

    auth,

    async (req, res) => {

        try {

            const { id } = req.params;

            const { status } = req.body;

            const result = await pool.query(

                `

                UPDATE tasks

                SET status = $1

                WHERE id = $2

                AND assigned_to = $3

                RETURNING *

                `,

                [

                    status,

                    id,

                    req.user.id
                ]
            );

            res.json(result.rows[0]);

        } catch (error) {

            console.error(error);

            res.status(500).json({

                error:'Failed to update task'
            });
        }
    }
);

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

    console.log(`Server running on port ${PORT}`);
});