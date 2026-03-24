import styled from 'styled-components';

const StyledInput = styled.input`
    padding: 10px 14px;
    background: #ffffff;
    border: 1px solid #dddddd;
    border-radius: 8px;
    font-size: 14px;
    font-family: 'Nunito', sans-serif;
    color: #333333;
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;

    &::placeholder {
        color: #aaaaaa;
    }

    &:focus {
        border-color: #4D96FF;
        box-shadow: 0 0 0 3px rgba(77, 150, 255, 0.2);
    }
`;

export default StyledInput;
