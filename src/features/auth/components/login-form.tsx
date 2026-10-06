import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Card, FieldError, Form, Input, Label, TextField } from '@heroui/react'
import axios from 'axios'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

import { loginSchema } from '@/features/auth/schemas/login.schema'
import { useAuth } from '@/features/auth/use-auth'
import type { LoginCredentials } from '@/features/auth/types'
import type { ApiResponse } from '@/lib/http/api-response'
import { ROUTE_PATHS } from '@/routes/route-paths'

function getLoginErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    return error.response?.data?.message || 'Không thể đăng nhập. Vui lòng thử lại.'
  }

  return 'Không thể đăng nhập. Vui lòng thử lại.'
}

export function LoginForm() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(credentials: LoginCredentials) {
    try {
      const user = await login(credentials)
      navigate(user.role === 'Admin' ? ROUTE_PATHS.DASHBOARD : ROUTE_PATHS.FORBIDDEN, {
        replace: true,
      })
    } catch (error: unknown) {
      setError('root', { message: getLoginErrorMessage(error) })
    }
  }

  return (
    <Card className="login-card" aria-labelledby="login-heading">
      <div className="login-card__brand" aria-label="VNZ Admin Portal">
        <span className="login-card__brand-mark">VNZ</span>
        <span className="login-card__brand-name">ADMIN PORTAL</span>
      </div>

      <div className="login-card__heading">
        <h1 id="login-heading">Đăng nhập</h1>
      </div>

      <Form
        className="login-card__form"
        onSubmit={handleSubmit(onSubmit)}
        validationBehavior="aria"
      >
        <TextField className="login-card__field" isInvalid={Boolean(errors.email)}>
          <Label>Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="Nhập email"
            {...register('email')}
          />
          {errors.email && (
            <FieldError className="login-card__error">
              {errors.email.message}
            </FieldError>
          )}
        </TextField>

        <TextField className="login-card__field" isInvalid={Boolean(errors.password)}>
          <Label>Mật khẩu</Label>
          <div className="login-card__password-input">
            <Input
              id="password"
              type={isPasswordVisible ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Nhập mật khẩu"
              {...register('password')}
            />
            <Button
              className="login-card__password-toggle"
              type="button"
              variant="ghost"
              isIconOnly
              aria-label={isPasswordVisible ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
              onClick={() => setIsPasswordVisible((visible) => !visible)}
            >
              {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
            </Button>
          </div>
          {errors.password && (
            <FieldError className="login-card__error">
              {errors.password.message}
            </FieldError>
          )}
        </TextField>

        {errors.root && <p className="login-card__error">{errors.root.message}</p>}

        <Button
          className="login-card__submit"
          type="submit"
          variant="primary"
          fullWidth
          isDisabled={isSubmitting}
        >
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </Button>
      </Form>

      <p className="login-card__footer">VNZ Admin Portal</p>
    </Card>
  )
}
