import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import "./login.scss"
import { post } from '../api/request'

function Login() {
  const navigate = useNavigate()

  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!username || !password) return alert('请输入账号和密码')
    setLoading(true)
    try {
      const res = await post<{ message: string; username: string; access: string; refresh: string }>('/api/login/', {
        username,
        password,
      })
      localStorage.setItem('accessToken', res.access)
      localStorage.setItem('refreshToken', res.refresh)
      console.log("登录成功：", res.message, res.username, res.access)
      navigate('/', { replace: true })
    } catch {
      alert('登录失败，请检查账号密码')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!username || !password) return alert('请输入账号和密码')
    setLoading(true)
    try {
      const res = await post<{ message: string; username: string }>('/api/register/', {
        username,
        password,
      })
      alert(res.message)
      setIsLogin(true)
    } catch {
      alert('注册失败，用户名可能已存在')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    isLogin ? handleLogin() : handleRegister()
  }

  return (
    <>
      <main className="main-content">
        <header className="login-header">
          {isLogin ? '登录' : '注册'}
        </header>
        <section className="login-form">
          <form className="login-form-content" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="请输入账号"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
            <input
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button type="submit" disabled={loading}>
              {loading ? '请稍候...' : isLogin ? '登录' : '注册'}
            </button>
            <p className="switch-text" onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? '没有账号？去注册' : '已有账号？去登录'}
            </p>
          </form>
        </section>
      </main>
    </>
  )
}

export default Login
