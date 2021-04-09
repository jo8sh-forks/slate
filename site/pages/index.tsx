import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { inspect } from '@xstate/inspect'

const Home = () => {
  const router = useRouter()

  useEffect(() => {
    router.replace(`/examples`)
  })

  return null
}

export default Home
