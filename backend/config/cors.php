<?php

return [

    'paths' => [
        'api/*',
        'login',
        'register-candidate',
        'sanctum/csrf-cookie',
    ],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'https://recruitment-system-lovat.vercel.app',
        'http://localhost:5176',
        'http://localhost:5173',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];