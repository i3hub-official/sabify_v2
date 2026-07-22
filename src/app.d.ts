// src/app.d.ts

import type { AuthenticatedUser, AuthSession } from '$lib/server/auth/types'

   declare global {
     namespace App {
       interface Locals {
         user?: AuthenticatedUser
         session?: AuthSession
       }
     }
   }