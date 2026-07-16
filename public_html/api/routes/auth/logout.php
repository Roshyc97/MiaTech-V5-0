<?php
use MiaTech\Response;
use MiaTech\Auth;
Auth::logout();
Response::ok();
