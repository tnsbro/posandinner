import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';

function useDataExist() {
    const { loggedInUserData } = useAuth();
    const navigate = useNavigate();

    console.log('useDataExist:', loggedInUserData);
    if (loggedInUserData === null) {
        navigate('/login');
    }
}

export default useDataExist;