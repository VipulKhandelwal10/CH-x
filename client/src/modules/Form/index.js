import { useState } from "react"
import Button from "../../components/Button"
import Input from "../../components/Input"
import { useNavigate } from 'react-router-dom'

const Form = ({
    isSignInPage = true,
}) => {
    const [data, setData] = useState({
        ...(!isSignInPage && {
            fullName: '',
            role: 'student' // Default role
        }),
        email: '',
        password: ''
    })
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`http://localhost:8000/api/${isSignInPage ? 'login' : 'register'}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
    
            const resData = await res.json();
    
            if (res.status === 400) {
                alert(resData.message || 'Invalid credentials');
            } else if (res.status === 201 || res.status === 200) {
                if (isSignInPage) {
                    localStorage.setItem('user:token', resData.token);
                    localStorage.setItem('user:detail', JSON.stringify(resData.user));
                    navigate('/');
                } else {
                    alert('Registration successful! Please sign in.');
                    navigate('/users/sign_in');
                }
            } else {
                alert('An error occurred. Please try again.');
            }
        } catch (error) {
            console.error('Form submission error:', error);
            alert('An error occurred. Please try again.');
        }
    };
  return (
    <div className="bg-light h-screen flex items-center justify-center">
        <div className=" bg-white w-[600px] h-[800px] shadow-lg rounded-lg flex flex-col justify-center items-center">
            <div className=" text-4xl font-extrabold">Welcome {isSignInPage && 'Back'}</div>
            <div className=" text-xl font-light mb-14">{isSignInPage ? 'Sign in to get explored' : 'Sign up to get started'}</div>
            <form className="flex flex-col items-center w-full" onSubmit={(e) => handleSubmit(e)}>
    {!isSignInPage && (
        <>
            <Input 
                label="Full name" 
                name="name" 
                placeholder="Enter your full name" 
                className="mb-6 w-[75%]" 
                value={data.fullName} 
                onChange={(e) => setData({ ...data, fullName: e.target.value })} 
            />
            <div className="mb-6 w-[75%]">
        <label className="block text-sm font-medium text-gray-800">Role</label>
        <select 
            value={data.role} 
            onChange={(e) => setData({ ...data, role: e.target.value })}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
        >
            <option value="">Select a role</option>
            <option value="student">Student</option>
            <option value="expert">Expert</option>
        </select>
    </div>
        </>
    )}
    <Input 
        label="Email address" 
        type="email" 
        name="email" 
        placeholder="Enter your email" 
        className="mb-6 w-[75%]" 
        value={data.email} 
        onChange={(e) => setData({ ...data, email: e.target.value })}
    />
    <Input 
        label="Password" 
        type="password" 
        name="password" 
        placeholder="Enter your Password" 
        className="mb-14 w-[75%]" 
        value={data.password} 
        onChange={(e) => setData({ ...data, password: e.target.value })}
    />
    <Button 
        label={isSignInPage ? 'Sign in': 'Sign up'} 
        type='submit' 
        className="w-[75%] mb-2" 
    />
</form>
            <div>{ isSignInPage ? "Didn't have an account?" : "Alredy have an account?"} <span className=" text-primary cursor-pointer underline" onClick={() => navigate(`/users/${isSignInPage ? 'sign_up' : 'sign_in'}`)}>{ isSignInPage ? 'Sign up' : 'Sign in'}</span></div>
        </div>
    </div>
  )
}

export default Form